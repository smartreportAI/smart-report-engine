/**
 * Admin Routes
 *
 * All /admin/* endpoints — requires admin or superadmin role.
 *
 * Dashboard:
 *   GET /admin/dashboard           — Overview stats
 *
 * Clients:
 *   GET    /admin/clients          — List all clients (with filters)
 *   GET    /admin/clients/:tenantId — Client detail
 *   POST   /admin/clients          — Onboard new client
 *   PATCH  /admin/clients/:tenantId — Update client config
 *   POST   /admin/clients/:tenantId/credits  — Add credits
 *   POST   /admin/clients/:tenantId/toggle   — Enable/disable
 *
 * Reports:
 *   GET /admin/reports             — List all reports (with filters)
 *   GET /admin/reports/:id         — Report detail
 *   GET /admin/reports/failures    — Failed reports only
 *   GET /admin/reports/unmapped    — Reports with unmapped params
 *   GET /admin/reports/stats       — Charts data
 *
 * Users:
 *   GET   /admin/users             — List all users
 *   PATCH /admin/users/:id         — Update user (disable, change role)
 *
 * Audit:
 *   GET /admin/audit-log           — Admin action history
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { hashPassword } from '../auth/auth.service';
import { getDb } from '../../database/connection';
import { COLLECTIONS } from '../../database/collections';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination.utils';
import { getToday, daysAgo, getMonthStart, getWeekStart, buildDateFilter } from '../../shared/utils/date.utils';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import type { ClientDocument, ClientStatus, ReportDocument } from '@smart-report/shared-types';
import type { UserDocument } from '../../database/schemas/user.schema';

/* ---------------------------------------------------------------
   Validation Schemas
   --------------------------------------------------------------- */

const OnboardClientSchema = z.object({
  tenantId: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'tenantId must be lowercase alphanumeric with dashes'),
  labName: z.string().min(1).max(200),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().optional(),
  gstNumber: z.string().optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).default('starter'),
  initialCredits: z.number().int().min(0).default(500),
  reportType: z.enum(['inDepth', 'essential']).default('inDepth'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#4F46E5'),
  webViewer: z.boolean().default(false),
  notes: z.string().optional(),
  // Subscription dates
  subscriptionStartDate: z.coerce.date(),
  subscriptionEndDate: z.coerce.date(),
  // Trial (optional — null means no trial, paid upfront)
  trialEndDate: z.coerce.date().optional(),
  trialCredits: z.number().int().min(0).optional(),
  // Auto-renew
  autoRenew: z.boolean().default(false),
  // Login credentials for the client's primary user (created together)
  userEmail: z.string().email('Valid email required for client login'),
  userPassword: z.string().min(8, 'Password must be at least 8 characters'),
  userName: z.string().min(1).max(100),
  userPhone: z.string().optional(),
});

const UpdateClientSchema = z.object({
  labName: z.string().min(1).max(200).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contactPerson: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().optional(),
  gstNumber: z.string().optional(),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Subscription management
  subscriptionStartDate: z.coerce.date().optional(),
  subscriptionEndDate: z.coerce.date().optional(),
  trialEndDate: z.coerce.date().nullable().optional(),
  autoRenew: z.boolean().optional(),
  status: z.enum(['onboarding', 'trial', 'active', 'expired', 'suspended']).optional(),
  // Report config
  reportConfig: z.object({
    reportType: z.enum(['inDepth', 'essential']).optional(),
    pageOrder: z.array(z.string()).optional(),
    profileContinuation: z.boolean().optional(),
    strictMapping: z.boolean().optional(),
    webViewer: z.boolean().optional(),
    branding: z.object({
      labName: z.string().optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      secondaryColor: z.string().optional(),
      footerText: z.string().optional(),
      showPoweredBy: z.boolean().optional(),
      headerHeight: z.string().optional(),
      headerMargin: z.string().optional(),
      footerHeight: z.string().optional(),
    }).optional(),
  }).optional(),
  webhook: z.object({
    url: z.string().url(),
    secret: z.string().optional(),
    format: z.enum(['json', 'multipart']).optional(),
    enabled: z.boolean().default(true),
  }).optional(),
});

const AddCreditsSchema = z.object({
  credits: z.number().int().min(1),
  amount: z.number().min(0).default(0),
  method: z.string().optional(),
  reference: z.string().optional(),
  note: z.string().optional(),
});

/* ---------------------------------------------------------------
   Route Registration
   --------------------------------------------------------------- */

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Apply auth + admin role check to all routes in this plugin
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('admin', 'superadmin'));

  /* ==============================================================
     DASHBOARD
     ============================================================== */

  app.get('/admin/dashboard', async (request, reply) => {
    const db = await getDb();
    const clients = db.collection(COLLECTIONS.CLIENTS);
    const reports = db.collection(COLLECTIONS.REPORTS);

    const { start: todayStart, end: todayEnd } = getToday();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    const [
      totalClients,
      liveClients,
      reportsToday,
      reportsThisWeek,
      reportsThisMonth,
      failuresToday,
      totalReports,
      lowCreditClients,
      expiringSoonClients,
    ] = await Promise.all([
      clients.countDocuments(),
      clients.countDocuments({ isLive: true }),
      reports.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      reports.countDocuments({ createdAt: { $gte: weekStart } }),
      reports.countDocuments({ createdAt: { $gte: monthStart } }),
      reports.countDocuments({ status: 'failed', createdAt: { $gte: todayStart, $lte: todayEnd } }),
      reports.countDocuments(),
      clients.countDocuments({ isLive: true, remainingCredits: { $lte: 100 } }),
      clients.countDocuments({
        isLive: true,
        subscriptionEndDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days from now
      }),
    ]);

    // Recent failures (last 5)
    const recentFailures = await reports
      .find({ status: 'failed' })
      .sort({ createdAt: -1 })
      .limit(5)
      .project({ labNo: 1, tenantId: 1, errorMessage: 1, createdAt: 1 })
      .toArray();

    return reply.code(200).send(successResponse({
      clients: {
        total: totalClients,
        live: liveClients,
        inactive: totalClients - liveClients,
        lowCredits: lowCreditClients,
        expiringSoon: expiringSoonClients,
      },
      reports: {
        total: totalReports,
        today: reportsToday,
        thisWeek: reportsThisWeek,
        thisMonth: reportsThisMonth,
        failuresToday,
      },
      recentFailures,
    }));
  });

  /* ==============================================================
     CLIENTS — LIST
     ============================================================== */

  app.get('/admin/clients', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
    });

    const db = await getDb();
    const collection = db.collection<ClientDocument>(COLLECTIONS.CLIENTS);

    // Build filter
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.$or = [
        { tenantId: { $regex: query.search, $options: 'i' } },
        { labName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status === 'live') filter.isLive = true;
    if (query.status === 'inactive') filter.isLive = false;
    if (query.plan) filter.plan = query.plan;

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  /* ==============================================================
     CLIENTS — DETAIL
     ============================================================== */

  app.get('/admin/clients/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const db = await getDb();

    const client = await db.collection<ClientDocument>(COLLECTIONS.CLIENTS).findOne({ tenantId });
    if (!client) {
      return reply.code(404).send(errorResponse('NOT_FOUND', `Client "${tenantId}" not found.`));
    }

    // Get recent reports for this client
    const recentReports = await db.collection<ReportDocument>(COLLECTIONS.REPORTS)
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ labNo: 1, patientName: 1, status: 1, abnormalCount: 1, createdAt: 1, overallScore: 1 })
      .toArray();

    // Get report stats
    const totalReportsCount = await db.collection(COLLECTIONS.REPORTS).countDocuments({ tenantId });
    const failuresCount = await db.collection(COLLECTIONS.REPORTS).countDocuments({ tenantId, status: 'failed' });

    return reply.code(200).send(successResponse({
      client,
      recentReports,
      stats: {
        totalReports: totalReportsCount,
        failures: failuresCount,
      },
    }));
  });

  /* ==============================================================
     CLIENTS — ONBOARD NEW
     ============================================================== */

  app.post('/admin/clients', async (request, reply) => {
    const parsed = OnboardClientSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const data = parsed.data;
    const db = await getDb();
    const collection = db.collection<ClientDocument>(COLLECTIONS.CLIENTS);

    // Check if tenantId already exists
    const existing = await collection.findOne({ tenantId: data.tenantId });
    if (existing) {
      return reply.code(409).send(
        errorResponse('TENANT_EXISTS', `Client with tenantId "${data.tenantId}" already exists.`),
      );
    }

    const now = new Date();
    const pageOrder = data.reportType === 'inDepth'
      ? ['indepth-cover', 'indepth-how-to-read', 'indepth-summary', 'indepth-detail', 'indepth-recommendations', 'indepth-back']
      : ['cover', 'summary', 'bloodPanel', 'recommendations'];

    // Determine initial status based on dates
    let status: 'onboarding' | 'trial' | 'active' = 'active';
    if (data.trialEndDate && now < data.trialEndDate) {
      status = 'trial';
    } else if (now < data.subscriptionStartDate) {
      status = 'onboarding';
    }

    const clientDoc: ClientDocument = {
      tenantId: data.tenantId,
      labName: data.labName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      contactPerson: data.contactPerson,
      address: data.address,
      city: data.city,
      state: data.state,
      website: data.website,
      gstNumber: data.gstNumber,
      plan: data.plan,
      status,
      subscriptionStartDate: data.subscriptionStartDate,
      subscriptionEndDate: data.subscriptionEndDate,
      trialEndDate: data.trialEndDate ?? null,
      trialCredits: data.trialCredits,
      autoRenew: data.autoRenew,
      isLive: status === 'active' || status === 'trial',
      liveDate: status === 'active' ? now : null,
      onboardedBy: request.user!.userId,
      totalCredits: data.initialCredits,
      usedCredits: 0,
      remainingCredits: data.initialCredits,
      payments: data.initialCredits > 0 ? [{
        date: now,
        amount: 0,
        credits: data.initialCredits,
        method: 'free',
        note: 'Onboarding credits',
        addedBy: request.user!.userId,
      }] : [],
      reportConfig: {
        reportType: data.reportType,
        pageOrder,
        profileContinuation: false,
        strictMapping: false,
        webViewer: data.webViewer,
        branding: {
          labName: data.labName,
          primaryColor: data.primaryColor,
          showPoweredBy: true,
        },
      },
      totalReports: 0,
      totalFailures: 0,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    await collection.insertOne(clientDoc);

    // ── Create user account for this client (single-step onboarding) ──
    const users = db.collection(COLLECTIONS.USERS);
    const existingUser = await users.findOne({ email: data.userEmail.toLowerCase().trim() });
    if (existingUser) {
      // Client was created but user email conflicts — rollback client
      await collection.deleteOne({ tenantId: data.tenantId });
      return reply.code(409).send(
        errorResponse('EMAIL_EXISTS', `A user with email "${data.userEmail}" already exists. Client was not created.`),
      );
    }

    const hashedPwd = await hashPassword(data.userPassword);
    await users.insertOne({
      email: data.userEmail.toLowerCase().trim(),
      password: hashedPwd,
      name: data.userName,
      phone: data.userPhone,
      role: 'client',
      tenantId: data.tenantId,
      isActive: true,
      createdBy: request.user!.userId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'client.create',
      description: `Onboarded new client: ${data.labName} (${data.tenantId}) with user ${data.userEmail}`,
      details: { tenantId: data.tenantId, plan: data.plan, credits: data.initialCredits, userEmail: data.userEmail },
      targetTenantId: data.tenantId,
      createdAt: now,
    });

    return reply.code(201).send(successResponse({
      tenantId: data.tenantId,
      labName: data.labName,
      user: {
        email: data.userEmail.toLowerCase().trim(),
        name: data.userName,
        role: 'client',
      },
    }));
  });

  /* ==============================================================
     CLIENTS — UPDATE
     ============================================================== */

  app.patch('/admin/clients/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = UpdateClientSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const db = await getDb();
    const collection = db.collection<ClientDocument>(COLLECTIONS.CLIENTS);

    const existing = await collection.findOne({ tenantId });
    if (!existing) {
      return reply.code(404).send(errorResponse('NOT_FOUND', `Client "${tenantId}" not found.`));
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const data = parsed.data;

    // Flat fields
    if (data.labName) updates.labName = data.labName;
    if (data.contactEmail !== undefined) updates.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updates.contactPhone = data.contactPhone;
    if (data.contactPerson !== undefined) updates.contactPerson = data.contactPerson;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.website !== undefined) updates.website = data.website;
    if (data.gstNumber !== undefined) updates.gstNumber = data.gstNumber;
    if (data.plan) updates.plan = data.plan;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.tags) updates.tags = data.tags;
    if (data.webhook) updates.webhook = data.webhook;

    // Subscription fields
    if (data.subscriptionStartDate) updates.subscriptionStartDate = data.subscriptionStartDate;
    if (data.subscriptionEndDate) updates.subscriptionEndDate = data.subscriptionEndDate;
    if (data.trialEndDate !== undefined) updates.trialEndDate = data.trialEndDate;
    if (data.autoRenew !== undefined) updates.autoRenew = data.autoRenew;
    if (data.status) updates.status = data.status;

    // Report config — merge with existing
    if (data.reportConfig) {
      const merged = { ...existing.reportConfig, ...data.reportConfig };
      if (data.reportConfig.branding) {
        merged.branding = { ...existing.reportConfig?.branding, ...data.reportConfig.branding };
      }
      updates.reportConfig = merged;
    }

    await collection.updateOne({ tenantId }, { $set: updates });

    // Audit
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'client.update',
      description: `Updated client: ${tenantId}`,
      details: data,
      targetTenantId: tenantId,
      createdAt: new Date(),
    });

    return reply.code(200).send(successResponse({ message: 'Client updated successfully.' }));
  });

  /* ==============================================================
     CLIENTS — ADD CREDITS
     ============================================================== */

  app.post('/admin/clients/:tenantId/credits', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = AddCreditsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const { credits, amount, method, reference, note } = parsed.data;
    const db = await getDb();
    const collection = db.collection<ClientDocument>(COLLECTIONS.CLIENTS);

    const existing = await collection.findOne({ tenantId });
    if (!existing) {
      return reply.code(404).send(errorResponse('NOT_FOUND', `Client "${tenantId}" not found.`));
    }

    const payment = {
      date: new Date(),
      amount,
      credits,
      method,
      reference,
      note,
      addedBy: request.user!.userId,
    };

    await collection.updateOne(
      { tenantId },
      {
        $inc: { totalCredits: credits, remainingCredits: credits },
        $push: { payments: payment } as any,
        $set: { updatedAt: new Date() },
      },
    );

    // Audit
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'client.addCredits',
      description: `Added ${credits} credits to ${tenantId}`,
      details: { credits, amount, method, reference },
      targetTenantId: tenantId,
      createdAt: new Date(),
    });

    return reply.code(200).send(successResponse({
      message: `Added ${credits} credits to ${tenantId}.`,
      newBalance: existing.remainingCredits + credits,
    }));
  });

  /* ==============================================================
     CLIENTS — TOGGLE (Enable/Disable)
     ============================================================== */

  app.post('/admin/clients/:tenantId/toggle', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const db = await getDb();
    const collection = db.collection<ClientDocument>(COLLECTIONS.CLIENTS);

    const existing = await collection.findOne({ tenantId });
    if (!existing) {
      return reply.code(404).send(errorResponse('NOT_FOUND', `Client "${tenantId}" not found.`));
    }

    const newStatus = !existing.isLive;
    await collection.updateOne(
      { tenantId },
      { $set: { isLive: newStatus, updatedAt: new Date() } },
    );

    // Audit
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: newStatus ? 'client.enable' : 'client.disable',
      description: `${newStatus ? 'Enabled' : 'Disabled'} client: ${tenantId}`,
      targetTenantId: tenantId,
      createdAt: new Date(),
    });

    return reply.code(200).send(successResponse({
      tenantId,
      isLive: newStatus,
      message: `Client ${newStatus ? 'enabled' : 'disabled'} successfully.`,
    }));
  });

  /* ==============================================================
     REPORTS — LIST
     ============================================================== */

  app.get('/admin/reports', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
    });

    const db = await getDb();
    const collection = db.collection<ReportDocument>(COLLECTIONS.REPORTS);

    const filter: Record<string, unknown> = {};
    if (query.tenantId) filter.tenantId = query.tenantId;
    if (query.status) filter.status = query.status;
    if (query.source) filter.source = query.source;
    if (query.search) {
      filter.$or = [
        { labNo: { $regex: query.search, $options: 'i' } },
        { patientName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.hasAbnormals === 'true') filter.abnormalCount = { $gt: 0 };

    const dateFilter = buildDateFilter(query.from, query.to);
    if (dateFilter) filter.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit)
        .project({ labNo: 1, tenantId: 1, patientName: 1, age: 1, gender: 1, status: 1, abnormalCount: 1, overallScore: 1, overallSeverity: 1, source: 1, createdAt: 1 })
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  /* ==============================================================
     REPORTS — DETAIL
     ============================================================== */

  app.get('/admin/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = await getDb();

    let filter: Record<string, unknown>;
    if (ObjectId.isValid(id)) {
      filter = { _id: new ObjectId(id) };
    } else {
      filter = { labNo: id };
    }

    const report = await db.collection<ReportDocument>(COLLECTIONS.REPORTS).findOne(filter);
    if (!report) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Report not found.'));
    }

    return reply.code(200).send(successResponse(report));
  });

  /* ==============================================================
     REPORTS — FAILURES
     ============================================================== */

  app.get('/admin/reports/failures', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
    });

    const db = await getDb();
    const collection = db.collection<ReportDocument>(COLLECTIONS.REPORTS);

    const filter: Record<string, unknown> = { status: 'failed' };
    if (query.tenantId) filter.tenantId = query.tenantId;

    const dateFilter = buildDateFilter(query.from, query.to);
    if (dateFilter) filter.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  /* ==============================================================
     REPORTS — UNMAPPED
     ============================================================== */

  app.get('/admin/reports/unmapped', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
    });

    const db = await getDb();
    const collection = db.collection<ReportDocument>(COLLECTIONS.REPORTS);

    const filter: Record<string, unknown> = { unmappedCount: { $gt: 0 } };
    if (query.tenantId) filter.tenantId = query.tenantId;

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit)
        .project({ labNo: 1, tenantId: 1, patientName: 1, unmappedCount: 1, unmappedParameters: 1, createdAt: 1 })
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  /* ==============================================================
     REPORTS — STATS (Charts data)
     ============================================================== */

  app.get('/admin/reports/stats', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const days = Number(query.days) || 30;
    const startDate = daysAgo(days);

    const db = await getDb();
    const collection = db.collection(COLLECTIONS.REPORTS);

    // Reports per day
    const perDay = await collection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Reports per tenant (top 10)
    const perTenant = await collection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray();

    // Reports per source
    const perSource = await collection.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]).toArray();

    return reply.code(200).send(successResponse({
      period: `last ${days} days`,
      perDay,
      perTenant,
      perSource,
    }));
  });

  /* ==============================================================
     USERS — LIST
     ============================================================== */

  app.get('/admin/users', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
    });

    const db = await getDb();
    const collection = db.collection<UserDocument>(COLLECTIONS.USERS);

    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.tenantId) filter.tenantId = query.tenantId;
    if (query.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      collection.find(filter, { projection: { password: 0, refreshToken: 0 } })
        .sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  /* ==============================================================
     USERS — UPDATE (disable, change role)
     ============================================================== */

  app.patch('/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    if (!ObjectId.isValid(id)) {
      return reply.code(400).send(errorResponse('INVALID_ID', 'Invalid user ID.'));
    }

    const db = await getDb();
    const users = db.collection<UserDocument>(COLLECTIONS.USERS);

    const user = await users.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'User not found.'));
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;
    if (typeof body.role === 'string' && ['admin', 'client', 'lab_staff'].includes(body.role)) {
      updates.role = body.role;
    }
    if (typeof body.name === 'string') updates.name = body.name;
    if (typeof body.phone === 'string') updates.phone = body.phone;

    await users.updateOne({ _id: new ObjectId(id) }, { $set: updates });

    return reply.code(200).send(successResponse({ message: 'User updated.' }));
  });

  /* ==============================================================
     AUDIT LOG
     ============================================================== */

  app.get('/admin/audit-log', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
    });

    const db = await getDb();
    const collection = db.collection(COLLECTIONS.AUDIT_LOGS);

    const filter: Record<string, unknown> = {};
    if (query.action) filter.action = { $regex: query.action, $options: 'i' };
    if (query.tenantId) filter.targetTenantId = query.tenantId;
    if (query.userId) filter.userId = query.userId;

    const dateFilter = buildDateFilter(query.from, query.to);
    if (dateFilter) filter.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });
}
