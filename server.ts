import express from 'express';
import path from 'path';
import {
  getOrganization,
  saveOrganization,
  listLocations,
  listPriorities,
  upsertPriority,
  deletePriority,
  replaceAllPriorities,
  listProjects,
  upsertProject,
  deleteProject,
  updateProjectStatus,
  listDepartments,
  upsertDepartment,
  deleteDepartment,
  listBudgetSources,
  upsertBudgetSource,
  deleteBudgetSource,
  listCrisesHarms,
  upsertCrisisHarm,
  deleteCrisisHarm,
  listExecutors,
  upsertExecutor,
  deleteExecutor,
  listContractors,
  upsertContractor,
  deleteContractor,
  listUsers,
  listRolesPermissions,
  listAuditLogs,
  addAuditLog,
  listAnalysisSources,
  upsertAnalysisSource,
  deleteAnalysisSource,
  checkDatabase,
  closePool,
  getDatabaseTarget,
  getPoolStats,
  initializeDatabase,
} from './server/database.js';
import { calculateSmartRecommendations } from './src/utils/recommendationEngine.js';
import { toPersianDigits } from './src/utils/numberUtils.js';
import type { CsrPriority, ExecutiveProject, OrganizationConfig } from './src/types.js';

/** Wrap a handler so thrown errors become 500 JSON instead of crashing the process. */
const wrap = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

async function startServer() {
  // Schema + seed + incremental data repairs, before the port opens. Failing
  // here must be loud: the container should restart instead of serving a
  // half-initialized API. The same steps are reachable as `bun run db:init`.
  await initializeDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- API ROUTES ---

  // Health reflects real persistence state: it pings PostgreSQL on every call
  // and answers 503 while the database is unreachable, so an orchestrator
  // restarts or holds traffic instead of silently serving errors.
  app.get('/api/health', wrap(async (_req, res) => {
    const database = await checkDatabase();
    res.status(database.ok ? 200 : 503).json({
      status: database.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'CSR Budgeting API',
      persistence: 'postgresql',
      database: { ...database, pool: getPoolStats() },
    });
  }));

  // Kept for backwards compatibility with older clients that only check that
  // the process is up.
  app.get('/api/health/live', wrap(async (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CSR Budgeting API',
      persistence: 'postgresql',
    });
  }));

  // -----------------------------------------------------------------
  // PostgreSQL-backed CRUD API
  // -----------------------------------------------------------------

  // Calculate budget allocation in Toman and Rial (from DB priorities)
  app.post('/api/calculate', wrap(async (req, res) => {
    const { totalBudgetToman, allocations } = req.body;
    const budget = Number(totalBudgetToman) || (await getOrganization()).totalBudget;

    let sumPercentage = 0;
    let totalAllocatedToman = 0;

    const items = (await listPriorities()).map((p) => {
      const pct = allocations && allocations[p.id] !== undefined ? Number(allocations[p.id]) : p.defaultPercentage;
      sumPercentage += pct;
      const amountToman = Math.round((budget * pct) / 100);
      const amountRial = amountToman * 10;
      totalAllocatedToman += amountToman;
      return {
        priorityId: p.id,
        code: p.code,
        title: p.title,
        category: p.category,
        percentage: pct,
        amountToman,
        amountRial,
      };
    });

    res.json({
      totalBudgetToman: budget,
      totalBudgetRial: budget * 10,
      sumPercentage: Math.round(sumPercentage * 10) / 10,
      totalAllocatedToman,
      totalAllocatedRial: totalAllocatedToman * 10,
      unallocatedToman: budget - totalAllocatedToman,
      isValid100Pct: Math.abs(100 - sumPercentage) < 0.1,
      items,
    });
  }));

  // Get Smart Algorithmic Recommendation based on Local Indicators
  app.post('/api/recommend', wrap(async (req, res) => {
    const { indicators, locationName } = req.body;
    const locations = await listLocations();
    const fallback = locations[0];
    const result = calculateSmartRecommendations(
      await listPriorities(),
      indicators || fallback?.indicators,
      locationName || fallback?.city || ''
    );
    res.json(result);
  }));

  // --- Organization ---
  app.get('/api/organization', wrap(async (req, res) => {
    res.json(await getOrganization());
  }));
  app.put('/api/organization', wrap(async (req, res) => {
    const org = req.body as OrganizationConfig;
    await saveOrganization(org);
    res.json(await getOrganization());
  }));

  // --- Locations ---
  app.get('/api/locations', wrap(async (req, res) => {
    res.json(await listLocations());
  }));

  // --- Priorities ---
  app.get('/api/priorities', wrap(async (req, res) => {
    res.json(await listPriorities());
  }));
  app.post('/api/priorities', wrap(async (req, res) => {
    const priority = req.body as CsrPriority;
    await upsertPriority(priority);
    res.status(201).json(priority);
  }));
  app.put('/api/priorities/import', wrap(async (req, res) => {
    // Bulk replace (CSV/Excel import flow)
    const items = req.body as CsrPriority[];
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of priorities' });
    }
    await replaceAllPriorities(items);
    res.json({ count: items.length });
  }));
  app.put('/api/priorities/:id', wrap(async (req, res) => {
    const priority = req.body as CsrPriority;
    if (priority.id !== req.params.id) {
      return res.status(400).json({ error: 'Body id must match URL id' });
    }
    await upsertPriority(priority);
    res.json(priority);
  }));
  app.delete('/api/priorities/:id', wrap(async (req, res) => {
    const ok = await deletePriority(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Priority not found' });
    res.json({ ok: true });
  }));

  // --- Projects ---
  app.get('/api/projects', wrap(async (req, res) => {
    res.json(await listProjects());
  }));
  app.post('/api/projects', wrap(async (req, res) => {
    const project = req.body as ExecutiveProject;
    await upsertProject(project);
    res.status(201).json(project);
  }));
  app.put('/api/projects/:id', wrap(async (req, res) => {
    const project = req.body as ExecutiveProject;
    if (project.id !== req.params.id) {
      return res.status(400).json({ error: 'Body id must match URL id' });
    }
    await upsertProject(project);
    res.json(project);
  }));
  app.patch('/api/projects/:id/status', wrap(async (req, res) => {
    const { status } = req.body;
    const updated = await updateProjectStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  }));
  app.delete('/api/projects/:id', wrap(async (req, res) => {
    const ok = await deleteProject(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  }));

  // --- Departments ---
  app.get('/api/departments', wrap(async (req, res) => {
    res.json(await listDepartments());
  }));
  app.post('/api/departments', wrap(async (req, res) => {
    await upsertDepartment(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/departments/:id', wrap(async (req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    await upsertDepartment(req.body);
    res.json(req.body);
  }));
  app.delete('/api/departments/:id', wrap(async (req, res) => {
    const ok = await deleteDepartment(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Department not found' });
    res.json({ ok: true });
  }));

  // --- Budget Sources ---
  app.get('/api/budget-sources', wrap(async (req, res) => {
    res.json(await listBudgetSources());
  }));
  app.post('/api/budget-sources', wrap(async (req, res) => {
    await upsertBudgetSource(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/budget-sources/:id', wrap(async (req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    await upsertBudgetSource(req.body);
    res.json(req.body);
  }));
  app.delete('/api/budget-sources/:id', wrap(async (req, res) => {
    const ok = await deleteBudgetSource(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Budget source not found' });
    res.json({ ok: true });
  }));

  // --- Crises & Harms ---
  app.get('/api/crises-harms', wrap(async (req, res) => {
    res.json(await listCrisesHarms());
  }));
  app.post('/api/crises-harms', wrap(async (req, res) => {
    await upsertCrisisHarm(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/crises-harms/:id', wrap(async (req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    await upsertCrisisHarm(req.body);
    res.json(req.body);
  }));
  app.delete('/api/crises-harms/:id', wrap(async (req, res) => {
    const ok = await deleteCrisisHarm(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Crisis/harm item not found' });
    res.json({ ok: true });
  }));

  // --- Executors ---
  app.get('/api/executors', wrap(async (req, res) => {
    res.json(await listExecutors());
  }));
  app.post('/api/executors', wrap(async (req, res) => {
    await upsertExecutor(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/executors/:id', wrap(async (req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    await upsertExecutor(req.body);
    res.json(req.body);
  }));
  app.delete('/api/executors/:id', wrap(async (req, res) => {
    const ok = await deleteExecutor(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Executor not found' });
    res.json({ ok: true });
  }));

  // --- Contractors ---
  app.get('/api/contractors', wrap(async (req, res) => {
    res.json(await listContractors());
  }));
  app.post('/api/contractors', wrap(async (req, res) => {
    await upsertContractor(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/contractors/:id', wrap(async (req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    await upsertContractor(req.body);
    res.json(req.body);
  }));
  app.delete('/api/contractors/:id', wrap(async (req, res) => {
    const ok = await deleteContractor(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Contractor not found' });
    res.json({ ok: true });
  }));

  // --- Users & Roles (read-only registry) ---
  app.get('/api/users', wrap(async (req, res) => {
    res.json(await listUsers());
  }));
  app.get('/api/roles-permissions', wrap(async (req, res) => {
    res.json(await listRolesPermissions());
  }));

  // --- Audit Logs ---
  app.get('/api/audit-logs', wrap(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(await listAuditLogs(limit));
  }));
  app.post('/api/audit-logs', wrap(async (req, res) => {
    await addAuditLog(req.body);
    res.status(201).json({ ok: true });
  }));

  // --- Analysis Sources ---
  // Inputs the analytical engine consumes (AI- or human-produced), managed
  // through a human-in-the-loop approve/edit workflow.
  app.get('/api/analysis-sources', wrap(async (req, res) => {
    res.json(await listAnalysisSources());
  }));
  app.post('/api/analysis-sources', wrap(async (req, res) => {
    await upsertAnalysisSource(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/analysis-sources/:id', wrap(async (req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    await upsertAnalysisSource(req.body);
    res.json(req.body);
  }));
  app.delete('/api/analysis-sources/:id', wrap(async (req, res) => {
    const ok = await deleteAnalysisSource(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Analysis source not found' });
    res.json({ ok: true });
  }));

  // Executive AI Narrative Report (rule-based, local analysis).
  // The narrative is assembled from the county the client is working in plus
  // recorded local data (crises, projects) so no location is hard-coded.
  app.post('/api/ai-analysis', wrap(async (req, res) => {
    const { locationName, locationId, totalBudgetToman } = req.body;
    const allLocations = await listLocations();
    // Match by explicit id first, then by the longest county name contained in
    // the display label the client sent, so the narrative always belongs to the
    // county the user is working in (never a fixed default county).
    const namedMatches = (locationName ? allLocations.filter((l) => String(locationName).includes(l.county)) : [])
      .slice()
      .sort((a, b) => b.county.length - a.county.length);
    const location =
      (locationId ? allLocations.find((l) => l.id === locationId) : undefined) ??
      namedMatches[0] ??
      allLocations.find((l) => l.city === locationName) ??
      allLocations[0];

    const countyLabel = location?.county ?? locationName ?? 'منطقه هدف';
    const countyCrises = location
      ? (await listCrisesHarms())
          .filter((c) => c.county === location.county)
          .sort((a, b) => b.severityScore - a.severityScore)
      : [];
    const countyProjects = location ? (await listProjects()).filter((p) => p.county === location.county) : [];
    const topCrisis = countyCrises[0];
    const indicators = location?.indicators;

    return res.json({
      isAiGenerated: false,
      executiveSummary: `تحلیل هوشمند برای ${countyLabel} (${location?.city ?? locationName}) بر اساس شاخص‌های محرومیت محلی و بودجه ${Number(totalBudgetToman || 0).toLocaleString('fa-IR')} تومان:`,
      keyTakeaways: [
        topCrisis
          ? `بالاترین شدت بحران ثبت‌شده در ${countyLabel} مربوط به «${topCrisis.title}» با شدت ${toPersianDigits(topCrisis.severityScore)}٪ و جمعیت تحت تأثیر ${topCrisis.affectedPopulation.toLocaleString('fa-IR')} نفر است.`
          : `داده بحران محلی برای ${countyLabel} ثبت نشده است و نیازسنجی میدانی توصیه می‌شود.`,
        `از ${toPersianDigits(countyProjects.length)} پروژه ثبت‌شده این شهرستان، ${toPersianDigits(countyProjects.filter((p) => p.status === 'IN_PROGRESS').length)} پروژه در حال اجرا و ${toPersianDigits(countyProjects.filter((p) => p.antiOverlapStatus !== 'CLEAR').length)} مورد نیازمند بازبینی هم‌پوشانی است.`,
        indicators
          ? `شاخص‌های کلیدی ${countyLabel}: نرخ فقر ${toPersianDigits(indicators.povertyRate)}٪، بیکاری ${toPersianDigits(indicators.unemploymentRate)}٪، کمبود زیرساخت ${toPersianDigits(indicators.infrastructureDeficit)}٪ و ریسک محیط‌زیستی ${toPersianDigits(indicators.environmentalRiskScore)}٪.`
          : `پایش فصلی پروژه‌ها توسط شورای راهبری محلی توصیه می‌شود.`,
      ],
      strategicAdvice: `جهت حداکثرسازی اثرگذاری ملموس برای عموم شهروندان ${countyLabel}، پروژه‌هایی با اولویت «${topCrisis?.recommendedIntervention ?? 'تکمیل زیرساخت پایه' }» در فاز نخست اجرا شوند و تخصیص منابع متناسب با شاخص‌های محرومیت همین شهرستان بازنگری گردد.`,
    });
  }));

  // --- VITE OR STATIC MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
    // Loaded lazily so the production image can install with --production:
    // Vite is build tooling and must never be a runtime dependency.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // JSON error handler for rejected promises / malformed bodies
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api] Unhandled error:', err);
    res.status(err?.status || err?.statusCode || 500).json({
      error: err?.message || 'Internal server error',
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`PostgreSQL: ${getDatabaseTarget()}`);
  });

  // Drain in-flight requests and close pooled connections on SIGTERM/SIGINT
  // (`docker compose down`, rolling deploys). A hard exit after 10s makes sure a
  // stuck socket can never block a deploy forever.
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] ${signal} received — draining`);
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('[api] Failed to start:', error);
  process.exit(1);
});
