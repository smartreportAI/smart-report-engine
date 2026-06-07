/**
 * Client Routes
 *
 * All /client/* endpoints — requires client role.
 * All queries are automatically scoped to the user's tenantId (from JWT).
 *
 * GET  /client/dashboard       — My stats
 * GET  /client/reports         — My reports (paginated, filterable)
 * GET  /client/reports/:labNo  — Report detail
 * GET  /client/reports/stats   — Charts data (reports per day)
 * GET  /client/credits         — Credit history
 * GET  /client/profile         — My lab info
 * PATCH /client/profile        — Update contact info
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth, requireClientScope } from '../auth/auth.middleware';
import { getDb } from '../../database/connection';
import { COLLECTIONS } from '../../database/collections';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination.utils';
import { getToday, daysAgo, getMonthStart, buildDateFilter } from '../../shared/utils/date.utils';
import { z } from 'zod';
import type { ClientDocument } from '../../database/schemas/client.schema';
import type { ReportDocument } from '../../database/schemas/report.schema';

/* ---------------------------------------------------------------
   Validation
   --------------------------------------------------------------- */

const UpdateProfileSchema = z.object({
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  website: z.string().url().optional(),
});

/* ---------------------------------------------------------------
   Route Registration
   --------------------------------------------------------------- */

export async function clientRoutes(app: FastifyInstance): Promise<void> {
  // Apply auth + client scope to all routes
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireClientScope);

  /**
   * Helper: Get the tenantId from the JWT.
   * Admins accessing client routes must pass ?tenantId query param.
   */
  function getTenantId(request: any): string | null {
    if (request.user.role === 'admin' || request.user.role === 'superadmin') {
      // Admin can view any client's data via query param
      const query = request.query as Record<string, string>;
      return query.tenantId || null;
    }
    return request.user.tenantId;
  }

  /* ==============================================================
     DASHBOARD
     ============================================================== */

  app.get('/client/dashboard', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const db = await getDb();
    const clients = db.collection<ClientDocument>(COLLECTIONS.CLIENTS);
    const reports = db.collection<ReportDocument>(COLLECTIONS.REPORTS);

    const { start: todayStart, end: todayEnd } = getToday();
    const monthStart = getMonthStart();

    const client = await clients.findOne({ tenantId });
    if (!client) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Client not found.'));
    }

    const [reportsToday, reportsThisMonth, totalReports, recentReports] = await Promise.all([
      reports.countDocuments({ tenantId, createdAt: { $gte: todayStart, $lte: todayEnd } }),
      reports.countDocuments({ tenantId, createdAt: { $gte: monthStart } }),
      reports.countDocuments({ tenantId }),
      reports.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ labNo: 1, patientName: 1, status: 1, abnormalCount: 1, overallScore: 1, createdAt: 1 })
        .toArray(),
    ]);

    return reply.code(200).send(successResponse({
      labName: client.labName,
      plan: client.plan,
      status: (client as any).status,
      subscription: {
        startDate: (client as any).subscriptionStartDate,
        endDate: (client as any).subscriptionEndDate,
        autoRenew: (client as any).autoRenew ?? false,
        daysRemaining: (client as any).subscriptionEndDate
          ? Math.max(0, Math.ceil((new Date((client as any).subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
          : null,
      },
      credits: {
        total: client.totalCredits,
        used: client.usedCredits,
        remaining: client.remainingCredits,
      },
      reports: {
        total: totalReports,
        today: reportsToday,
        thisMonth: reportsThisMonth,
      },
      recentReports,
    }));
  });

  /* ==============================================================
     REPORTS — LIST
     ============================================================== */

  app.get('/client/reports', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder as 'asc' | 'desc' | undefined,
    });

    const db = await getDb();
    const collection = db.collection<ReportDocument>(COLLECTIONS.REPORTS);

    const filter: Record<string, unknown> = { tenantId };
    if (query.search) {
      filter.$or = [
        { labNo: { $regex: query.search, $options: 'i' } },
        { patientName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status) filter.status = query.status;

    const dateFilter = buildDateFilter(query.from, query.to);
    if (dateFilter) filter.createdAt = dateFilter;

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit)
        .project({ labNo: 1, patientName: 1, age: 1, gender: 1, status: 1, abnormalCount: 1, normalCount: 1, overallScore: 1, overallSeverity: 1, createdAt: 1, pdfUrl: 1 })
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  /* ==============================================================
     REPORTS — DETAIL
     ============================================================== */

  app.get('/client/reports/:labNo', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const { labNo } = request.params as { labNo: string };
    const db = await getDb();

    const report = await db.collection<ReportDocument>(COLLECTIONS.REPORTS).findOne({
      tenantId,
      labNo,
    });

    if (!report) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Report not found.'));
    }

    return reply.code(200).send(successResponse(report));
  });

  /* ==============================================================
     REPORTS — STATS
     ============================================================== */

  app.get('/client/reports/stats', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const query = request.query as Record<string, string>;
    const days = Number(query.days) || 30;
    const startDate = daysAgo(days);

    const db = await getDb();
    const collection = db.collection(COLLECTIONS.REPORTS);

    const perDay = await collection.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          failures: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    // Severity distribution
    const severityDist = await collection.aggregate([
      { $match: { tenantId, createdAt: { $gte: startDate }, overallSeverity: { $exists: true } } },
      { $group: { _id: '$overallSeverity', count: { $sum: 1 } } },
    ]).toArray();

    return reply.code(200).send(successResponse({
      period: `last ${days} days`,
      perDay,
      severityDistribution: severityDist,
    }));
  });

  /* ==============================================================
     CREDITS
     ============================================================== */

  app.get('/client/credits', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const db = await getDb();
    const client = await db.collection<ClientDocument>(COLLECTIONS.CLIENTS).findOne({ tenantId });
    if (!client) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Client not found.'));
    }

    return reply.code(200).send(successResponse({
      totalCredits: client.totalCredits,
      usedCredits: client.usedCredits,
      remainingCredits: client.remainingCredits,
      payments: client.payments ?? [],
    }));
  });

  /* ==============================================================
     PROFILE — GET
     ============================================================== */

  app.get('/client/profile', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const db = await getDb();
    const client = await db.collection<ClientDocument>(COLLECTIONS.CLIENTS).findOne(
      { tenantId },
      { projection: { payments: 0 } }, // Don't expose full payment details
    );
    if (!client) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Client not found.'));
    }

    return reply.code(200).send(successResponse({
      tenantId: client.tenantId,
      labName: client.labName,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      address: client.address,
      city: client.city,
      state: client.state,
      website: client.website,
      plan: client.plan,
      isLive: client.isLive,
      liveDate: client.liveDate,
      totalReports: client.totalReports,
      createdAt: client.createdAt,
    }));
  });

  /* ==============================================================
     PROFILE — UPDATE (limited: contact info only)
     ============================================================== */

  app.patch('/client/profile', async (request, reply) => {
    const tenantId = getTenantId(request);
    if (!tenantId) {
      return reply.code(400).send(errorResponse('MISSING_TENANT', 'tenantId is required.'));
    }

    const parsed = UpdateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors),
      );
    }

    const db = await getDb();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const data = parsed.data;

    if (data.contactEmail !== undefined) updates.contactEmail = data.contactEmail;
    if (data.contactPhone !== undefined) updates.contactPhone = data.contactPhone;
    if (data.address !== undefined) updates.address = data.address;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    if (data.website !== undefined) updates.website = data.website;

    await db.collection(COLLECTIONS.CLIENTS).updateOne({ tenantId }, { $set: updates });

    return reply.code(200).send(successResponse({ message: 'Profile updated successfully.' }));
  });
}
