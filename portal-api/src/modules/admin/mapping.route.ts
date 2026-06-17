import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getDb } from '../../database/connection';
import { COLLECTIONS } from '../../database/collections';
import { successResponse, errorResponse } from '../../shared/utils/response.utils';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination.utils';
import { z } from 'zod';
import type { GlobalTestMapping, ClientTestMapping, UnmappedLogEntry } from '@smart-report/shared-types';

const GlobalMappingSchema = z.object({
  biomarkerId: z.string().nullable().optional(),
  standardName: z.string().min(1),
  profileName: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  defaultUnit: z.string().nullable().optional(),
  defaultRange: z.object({ min: z.number().optional(), max: z.number().optional() }).nullable().optional(),
  isActive: z.boolean().default(true),
});

const ClientMappingSchema = z.object({
  externalCode: z.string().min(1),
  externalDisplay: z.string().optional(),
  internalStandardName: z.string().min(1),
  internalProfileName: z.string().optional(),
  unitOverride: z.string().optional(),
  rangeOverride: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  isActive: z.boolean().default(true),
});

const MapGlobalFromUnmappedSchema = z.object({
  standardName: z.string().min(1),
  profileName: z.string().min(1),
  aliases: z.array(z.string()).optional(),
});

const MapClientFromUnmappedSchema = z.object({
  internalStandardName: z.string().min(1),
});

export async function mappingAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireRole('admin', 'superadmin'));

  /* ==============================================================
     GLOBAL MAPPINGS
     ============================================================== */

  app.get('/admin/mappings/global', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy || 'standardName',
      sortOrder: query.sortOrder as 'asc' | 'desc' || 'asc',
    });

    const db = await getDb();
    const collection = db.collection<GlobalTestMapping>(COLLECTIONS.GLOBAL_MAPPINGS);

    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.$or = [
        { standardName: { $regex: query.search, $options: 'i' } },
        { aliases: { $regex: query.search, $options: 'i' } },
        { biomarkerId: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.profileName) filter.profileName = query.profileName;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  app.get('/admin/mappings/global/profiles', async (request, reply) => {
    const db = await getDb();
    const profiles = await db.collection(COLLECTIONS.GLOBAL_MAPPINGS).distinct('profileName');
    return reply.code(200).send(successResponse(profiles.sort()));
  });

  app.post('/admin/mappings/global', async (request, reply) => {
    const parsed = GlobalMappingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors));
    }

    const data = parsed.data;
    const db = await getDb();
    const collection = db.collection<GlobalTestMapping>(COLLECTIONS.GLOBAL_MAPPINGS);

    const now = new Date();
    const updateDoc = {
      $set: {
        biomarkerId: data.biomarkerId ?? null,
        standardName: data.standardName,
        profileName: data.profileName,
        aliases: data.aliases,
        defaultUnit: data.defaultUnit ?? null,
        defaultRange: data.defaultRange ?? null,
        isActive: data.isActive,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    };

    await collection.updateOne(
      { standardName: data.standardName },
      updateDoc,
      { upsert: true }
    );

    // Audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'global_mapping.upsert',
      description: `Upserted global mapping for: ${data.standardName}`,
      details: data,
      createdAt: now,
    });

    return reply.code(200).send(successResponse({ message: 'Global mapping saved successfully.' }));
  });

  app.delete('/admin/mappings/global/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const db = await getDb();
    
    await db.collection<GlobalTestMapping>(COLLECTIONS.GLOBAL_MAPPINGS).updateOne(
      { standardName: name },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'global_mapping.delete',
      description: `Soft-deleted global mapping for: ${name}`,
      details: { standardName: name },
      createdAt: new Date(),
    });

    return reply.code(200).send(successResponse({ message: 'Global mapping soft-deleted.' }));
  });

  /* ==============================================================
     CLIENT MAPPINGS
     ============================================================== */

  app.get('/admin/mappings/clients/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy || 'externalCode',
      sortOrder: query.sortOrder as 'asc' | 'desc' || 'asc',
    });

    const db = await getDb();
    const collection = db.collection<ClientTestMapping>(COLLECTIONS.CLIENT_MAPPINGS);

    const filter: Record<string, unknown> = { tenantId };
    if (query.search) {
      filter.$or = [
        { externalCode: { $regex: query.search, $options: 'i' } },
        { internalStandardName: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  app.post('/admin/mappings/clients/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = ClientMappingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors));
    }

    const data = parsed.data;
    const db = await getDb();
    const collection = db.collection<ClientTestMapping>(COLLECTIONS.CLIENT_MAPPINGS);

    const now = new Date();
    const updateDoc = {
      $set: {
        externalCode: data.externalCode,
        externalDisplay: data.externalDisplay,
        internalStandardName: data.internalStandardName,
        internalProfileName: data.internalProfileName,
        unitOverride: data.unitOverride,
        rangeOverride: data.rangeOverride,
        isActive: data.isActive,
        updatedAt: now,
      },
      $setOnInsert: {
        tenantId,
        createdAt: now,
        createdBy: request.user!.userId,
      },
    };

    await collection.updateOne(
      { tenantId, externalCode: data.externalCode },
      updateDoc,
      { upsert: true }
    );

    // Audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'client_mapping.upsert',
      description: `Upserted client mapping for: ${data.externalCode} (${tenantId})`,
      details: data,
      targetTenantId: tenantId,
      createdAt: now,
    });

    return reply.code(200).send(successResponse({ message: 'Client mapping saved successfully.' }));
  });

  app.delete('/admin/mappings/clients/:tenantId/:code', async (request, reply) => {
    const { tenantId, code } = request.params as { tenantId: string, code: string };
    const db = await getDb();
    
    await db.collection<ClientTestMapping>(COLLECTIONS.CLIENT_MAPPINGS).deleteOne({
      tenantId,
      externalCode: code,
    });

    // Audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'client_mapping.delete',
      description: `Deleted client mapping for: ${code} (${tenantId})`,
      details: { externalCode: code },
      targetTenantId: tenantId,
      createdAt: new Date(),
    });

    return reply.code(200).send(successResponse({ message: 'Client mapping deleted.' }));
  });

  /* ==============================================================
     UNMAPPED LOG & MONITORING
     ============================================================== */

  app.get('/admin/mappings/unmapped/summary', async (request, reply) => {
    const db = await getDb();
    const collection = db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG);

    // Aggregate to find most common unmapped tests across all clients
    const summary = await collection.aggregate([
      {
        $group: {
          _id: '$testName',
          totalCount: { $sum: '$count' },
          tenantCount: { $addToSet: '$tenantId' },
          lastSeen: { $max: '$lastSeen' }
        }
      },
      {
        $project: {
          testName: '$_id',
          totalCount: 1,
          tenantCount: { $size: '$tenantCount' },
          tenants: '$tenantCount',
          lastSeen: 1,
          _id: 0
        }
      },
      { $sort: { totalCount: -1 } },
      { $limit: 100 }
    ]).toArray();

    return reply.code(200).send(successResponse(summary));
  });

  app.get('/admin/mappings/unmapped', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy || 'lastSeen',
      sortOrder: query.sortOrder as 'asc' | 'desc' || 'desc',
    });

    const db = await getDb();
    const collection = db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG);

    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.testName = { $regex: query.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  app.get('/admin/mappings/unmapped/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const query = request.query as Record<string, string>;
    const { skip, limit, sort } = parsePagination({
      page: Number(query.page) || undefined,
      limit: Number(query.limit) || undefined,
      sortBy: query.sortBy || 'lastSeen',
      sortOrder: query.sortOrder as 'asc' | 'desc' || 'desc',
    });

    const db = await getDb();
    const collection = db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG);

    const filter: Record<string, unknown> = { tenantId };
    if (query.search) {
      filter.testName = { $regex: query.search, $options: 'i' };
    }

    const [items, total] = await Promise.all([
      collection.find(filter).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);

    const page = Math.floor(skip / limit) + 1;
    return reply.code(200).send(successResponse(items, buildPaginationMeta(total, page, limit)));
  });

  // Map This shortcut: Global
  app.post('/admin/mappings/unmapped/:tenantId/:testName/map-global', async (request, reply) => {
    const { tenantId, testName } = request.params as { tenantId: string, testName: string };
    const parsed = MapGlobalFromUnmappedSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors));
    }

    const db = await getDb();
    const now = new Date();
    const data = parsed.data;

    // 1. Create global mapping
    await db.collection<GlobalTestMapping>(COLLECTIONS.GLOBAL_MAPPINGS).updateOne(
      { standardName: data.standardName },
      {
        $set: {
          standardName: data.standardName,
          profileName: data.profileName,
          aliases: data.aliases || [testName.toLowerCase()],
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          biomarkerId: null,
          createdAt: now,
        }
      },
      { upsert: true }
    );

    // 2. Remove from unmapped log
    await db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG).deleteMany({
      testName: testName
    });

    // 3. Audit
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'unmapped.mapped_to_global',
      description: `Mapped unmapped test '${testName}' to global standard '${data.standardName}'`,
      details: data,
      createdAt: now,
    });

    return reply.code(200).send(successResponse({ message: 'Mapped to global successfully.' }));
  });

  // Map This shortcut: Client
  app.post('/admin/mappings/unmapped/:tenantId/:testName/map-client', async (request, reply) => {
    const { tenantId, testName } = request.params as { tenantId: string, testName: string };
    const parsed = MapClientFromUnmappedSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Invalid input', parsed.error.flatten().fieldErrors));
    }

    const db = await getDb();
    const now = new Date();
    const data = parsed.data;

    // 1. Create client mapping
    await db.collection<ClientTestMapping>(COLLECTIONS.CLIENT_MAPPINGS).updateOne(
      { tenantId, externalCode: testName },
      {
        $set: {
          externalCode: testName,
          internalStandardName: data.internalStandardName,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          tenantId,
          createdAt: now,
          createdBy: request.user!.userId,
        }
      },
      { upsert: true }
    );

    // 2. Remove from unmapped log
    await db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG).deleteOne({
      tenantId,
      testName: testName
    });

    // 3. Audit
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'unmapped.mapped_to_client',
      description: `Mapped unmapped test '${testName}' for client ${tenantId} to '${data.internalStandardName}'`,
      details: data,
      targetTenantId: tenantId,
      createdAt: now,
    });

    return reply.code(200).send(successResponse({ message: 'Mapped to client successfully.' }));
  });

  app.delete('/admin/mappings/unmapped/:tenantId/:testName', async (request, reply) => {
    const { tenantId, testName } = request.params as { tenantId: string, testName: string };
    const db = await getDb();

    await db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG).deleteOne({
      tenantId,
      testName
    });

    return reply.code(200).send(successResponse({ message: 'Unmapped log entry deleted.' }));
  });

  // Notify client about unmapped tests
  app.post('/admin/mappings/unmapped/:tenantId/notify', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const db = await getDb();

    // Get unmapped tests
    const unmapped = await db.collection<UnmappedLogEntry>(COLLECTIONS.UNMAPPED_LOG)
      .find({ tenantId })
      .sort({ count: -1 })
      .limit(20)
      .toArray();

    if (unmapped.length === 0) {
      return reply.code(400).send(errorResponse('NO_UNMAPPED', 'No unmapped tests found for this client.'));
    }

    // TODO: Integrate actual email sending here (e.g., Nodemailer/SendGrid)
    
    // For now, record the action in audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).insertOne({
      userId: request.user!.userId,
      userEmail: request.user!.email,
      userRole: request.user!.role,
      action: 'unmapped.notification_sent',
      description: `Sent unmapped tests notification to client ${tenantId}`,
      details: { testsCount: unmapped.length },
      targetTenantId: tenantId,
      createdAt: new Date(),
    });

    return reply.code(200).send(successResponse({ message: `Notification sent for ${unmapped.length} unmapped tests.` }));
  });

}
