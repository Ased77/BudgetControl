import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
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
} from './server/database.js';
import { calculateSmartRecommendations } from './src/utils/recommendationEngine.js';
import { toPersianDigits } from './src/utils/numberUtils.js';
import type { CsrPriority, ExecutiveProject, OrganizationConfig } from './src/types.js';

/** Wrap a handler so thrown errors become 500 JSON instead of crashing the process. */
const wrap = (fn: express.RequestHandler): express.RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini AI lazily
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        try {
          aiClient = new GoogleGenAI({ apiKey });
        } catch (e) {
          console.warn('Gemini client initialization warning:', e);
        }
      }
    }
    return aiClient;
  }

  // --- API ROUTES ---

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CSR Budgeting API',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });  // -----------------------------------------------------------------
  // SQLite-backed CRUD API
  // -----------------------------------------------------------------

  // Health now reflects real persistence state
  app.get('/api/health', wrap((req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'CSR Budgeting API',
      persistence: 'sqlite',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  }));

  // Calculate budget allocation in Toman and Rial (from DB priorities)
  app.post('/api/calculate', wrap((req, res) => {
    const { totalBudgetToman, allocations } = req.body;
    const budget = Number(totalBudgetToman) || getOrganization().totalBudget;

    let sumPercentage = 0;
    let totalAllocatedToman = 0;

    const items = listPriorities().map((p) => {
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
  app.post('/api/recommend', wrap((req, res) => {
    const { indicators, locationName } = req.body;
    const locations = listLocations();
    const fallback = locations[0];
    const result = calculateSmartRecommendations(
      listPriorities(),
      indicators || fallback?.indicators,
      locationName || fallback?.city || ''
    );
    res.json(result);
  }));

  // --- Organization ---
  app.get('/api/organization', wrap((req, res) => {
    res.json(getOrganization());
  }));
  app.put('/api/organization', wrap((req, res) => {
    const org = req.body as OrganizationConfig;
    saveOrganization(org);
    res.json(getOrganization());
  }));

  // --- Locations ---
  app.get('/api/locations', wrap((req, res) => {
    res.json(listLocations());
  }));

  // --- Priorities ---
  app.get('/api/priorities', wrap((req, res) => {
    res.json(listPriorities());
  }));
  app.post('/api/priorities', wrap((req, res) => {
    const priority = req.body as CsrPriority;
    upsertPriority(priority);
    res.status(201).json(priority);
  }));
  app.put('/api/priorities/import', wrap((req, res) => {
    // Bulk replace (CSV/Excel import flow)
    const items = req.body as CsrPriority[];
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of priorities' });
    }
    replaceAllPriorities(items);
    res.json({ count: items.length });
  }));
  app.put('/api/priorities/:id', wrap((req, res) => {
    const priority = req.body as CsrPriority;
    if (priority.id !== req.params.id) {
      return res.status(400).json({ error: 'Body id must match URL id' });
    }
    upsertPriority(priority);
    res.json(priority);
  }));
  app.delete('/api/priorities/:id', wrap((req, res) => {
    const ok = deletePriority(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Priority not found' });
    res.json({ ok: true });
  }));

  // --- Projects ---
  app.get('/api/projects', wrap((req, res) => {
    res.json(listProjects());
  }));
  app.post('/api/projects', wrap((req, res) => {
    const project = req.body as ExecutiveProject;
    upsertProject(project);
    res.status(201).json(project);
  }));
  app.put('/api/projects/:id', wrap((req, res) => {
    const project = req.body as ExecutiveProject;
    if (project.id !== req.params.id) {
      return res.status(400).json({ error: 'Body id must match URL id' });
    }
    upsertProject(project);
    res.json(project);
  }));
  app.patch('/api/projects/:id/status', wrap((req, res) => {
    const { status } = req.body;
    const updated = updateProjectStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  }));
  app.delete('/api/projects/:id', wrap((req, res) => {
    const ok = deleteProject(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  }));

  // --- Departments ---
  app.get('/api/departments', wrap((req, res) => {
    res.json(listDepartments());
  }));
  app.post('/api/departments', wrap((req, res) => {
    upsertDepartment(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/departments/:id', wrap((req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    upsertDepartment(req.body);
    res.json(req.body);
  }));
  app.delete('/api/departments/:id', wrap((req, res) => {
    const ok = deleteDepartment(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Department not found' });
    res.json({ ok: true });
  }));

  // --- Budget Sources ---
  app.get('/api/budget-sources', wrap((req, res) => {
    res.json(listBudgetSources());
  }));
  app.post('/api/budget-sources', wrap((req, res) => {
    upsertBudgetSource(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/budget-sources/:id', wrap((req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    upsertBudgetSource(req.body);
    res.json(req.body);
  }));
  app.delete('/api/budget-sources/:id', wrap((req, res) => {
    const ok = deleteBudgetSource(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Budget source not found' });
    res.json({ ok: true });
  }));

  // --- Crises & Harms ---
  app.get('/api/crises-harms', wrap((req, res) => {
    res.json(listCrisesHarms());
  }));
  app.post('/api/crises-harms', wrap((req, res) => {
    upsertCrisisHarm(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/crises-harms/:id', wrap((req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    upsertCrisisHarm(req.body);
    res.json(req.body);
  }));
  app.delete('/api/crises-harms/:id', wrap((req, res) => {
    const ok = deleteCrisisHarm(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Crisis/harm item not found' });
    res.json({ ok: true });
  }));

  // --- Executors ---
  app.get('/api/executors', wrap((req, res) => {
    res.json(listExecutors());
  }));
  app.post('/api/executors', wrap((req, res) => {
    upsertExecutor(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/executors/:id', wrap((req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    upsertExecutor(req.body);
    res.json(req.body);
  }));
  app.delete('/api/executors/:id', wrap((req, res) => {
    const ok = deleteExecutor(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Executor not found' });
    res.json({ ok: true });
  }));

  // --- Contractors ---
  app.get('/api/contractors', wrap((req, res) => {
    res.json(listContractors());
  }));
  app.post('/api/contractors', wrap((req, res) => {
    upsertContractor(req.body);
    res.status(201).json(req.body);
  }));
  app.put('/api/contractors/:id', wrap((req, res) => {
    if (req.body.id !== req.params.id) return res.status(400).json({ error: 'Body id must match URL id' });
    upsertContractor(req.body);
    res.json(req.body);
  }));
  app.delete('/api/contractors/:id', wrap((req, res) => {
    const ok = deleteContractor(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Contractor not found' });
    res.json({ ok: true });
  }));

  // --- Users & Roles (read-only registry) ---
  app.get('/api/users', wrap((req, res) => {
    res.json(listUsers());
  }));
  app.get('/api/roles-permissions', wrap((req, res) => {
    res.json(listRolesPermissions());
  }));

  // --- Audit Logs ---
  app.get('/api/audit-logs', wrap((req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    res.json(listAuditLogs(limit));
  }));
  app.post('/api/audit-logs', wrap((req, res) => {
    addAuditLog(req.body);
    res.status(201).json({ ok: true });
  }));

  // Executive AI Narrative Report using Gemini
  app.post('/api/ai-analysis', wrap(async (req, res) => {
    try {
      const { orgName, totalBudgetToman, locationName, indicators, currentAllocations } = req.body;
      const gemini = getGeminiClient();

      if (!gemini) {
        // Return structured Fallback Analysis if no API key is active
        return res.json({
          isAiGenerated: false,
          executiveSummary: `تحلیل هوشمند برای ${locationName} بر اساس شاخص‌های محرومیت محلی و بودجه ${totalBudgetToman.toLocaleString('fa-IR')} تومان:`,
          keyTakeaways: [
            `بالاترین اولویت بر اساس داده‌های محرومیت منطقه ${locationName}، ساماندهی سکونتگاه‌های غیررسمی و کاهش آسیب‌های اجتماعی است.`,
            `پیشنهاد می‌شود حداقل ۳۵٪ از بودجه کل صرف طرح‌های دوجانبه زیرساخت و سلامت روانی-اجتماعی گردد.`,
            `توصیه می‌شود پایش پروژه‌ها به‌صورت کوارترلی توسط نماینده شورای راهبری محلی صورت پذیرد.`,
          ],
          strategicAdvice: `جهت حداکثرسازی اثرگذاری ملموس برای عموم شهروندان در سراسر شهرستان رفسنجان، پروژه‌هایی با اولویت رفع تنش آبی، تجهیز مراکز درمانی و بهسازی محلات حاشیه‌ای در فاز نخست اجرا شوند.`,
        });
      }

      const prompt = `
تو یک مشاور ارشد و تحلیل‌گر استراتژیک مسؤولیت اجتماعی شرکتی (CSR) در ایران هستی.
یک تحلیل مدیریتی رسمی و کارشناسی به زبان فارسی برای هیئت‌مدیره شرکت "${orgName}" آماده کن.

اطلاعات ورودی:
- بودجه کل CSR: ${totalBudgetToman.toLocaleString('fa-IR')} تومان
- منطقه جغرافیایی: ${locationName}
- نرخ فقر محلی: ${toPersianDigits(indicators?.povertyRate || 38)}٪
- نرخ حاشیه‌نشینی: ${toPersianDigits(indicators?.marginalizationRate || 42)}٪
- نرخ بیکاری: ${toPersianDigits(indicators?.unemploymentRate || 24)}٪
- شاخص آسیب‌های اجتماعی: ${toPersianDigits(indicators?.socialHarmsIndex || 70)} از ۱۰۰

پاسخ را در قالب یک JSON معتبر با ساختار زیر برگردان (بدون هیچ مارک‌داون یا توضیح اضافه):
{
  "executiveSummary": "متن خلاصه مدیریتی کوتاه و فاخر (۲ الی ۳ جمله)",
  "keyTakeaways": ["نکته کلیدی ۱", "نکته کلیدی ۲", "نکته کلیدی ۳"],
  "strategicAdvice": "توصیه استراتژیک نهایی برای هیئت مدیره جهت افزایش شفافیت و رضایت جامعه محلی"
}
      `;

      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText);

      return res.json({
        isAiGenerated: true,
        ...parsed,
      });
    } catch (error: any) {
      console.error('Gemini AI analysis error:', error);
      return res.json({
        isAiGenerated: false,
        executiveSummary: `گزارش تحلیل راهبردی بودجه CSR برای منطقه هدف بر اساس داده‌های منطقه‌ای آماده شد.`,
        keyTakeaways: [
          `تمرکز بودجه بر ۲ اولویت اصلی آسیب‌های اجتماعی و حاشیه‌نشینی معطوف است.`,
          `تخصیص متوازن اعتبارات خرد باعث ارتقای سرمایه اجتماعی شرکت در جامعه محلی می‌گردد.`,
        ],
        strategicAdvice: `تصویب برنامه تخصیص پیشنهادی در هیئت مدیره و درج آن در گزارش پایداری سالانه شرکتی.`,
      });
    }
  }));

  // --- VITE OR STATIC MIDDLEWARE ---

  if (process.env.NODE_ENV !== 'production') {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    console.log(`SQLite database: data/csr-app.db (override with SQLITE_PATH)`);
  });
}

startServer();
