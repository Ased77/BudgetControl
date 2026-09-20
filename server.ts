import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_PRIORITIES, INITIAL_ORGANIZATION, INITIAL_LOCATIONS } from './src/data/initialData.js';
import { calculateSmartRecommendations } from './src/utils/recommendationEngine.js';
import { toPersianDigits } from './src/utils/numberUtils.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

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
  });

  // Calculate budget allocation in Toman and Rial
  app.post('/api/calculate', (req, res) => {
    try {
      const { totalBudgetToman, allocations } = req.body;
      const budget = Number(totalBudgetToman) || INITIAL_ORGANIZATION.totalBudget;

      let sumPercentage = 0;
      let totalAllocatedToman = 0;

      const items = INITIAL_PRIORITIES.map((p) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to calculate allocation' });
    }
  });

  // Get Smart Algorithmic Recommendation based on Local Indicators
  app.post('/api/recommend', (req, res) => {
    try {
      const { indicators, locationName } = req.body;
      const result = calculateSmartRecommendations(
        INITIAL_PRIORITIES,
        indicators || INITIAL_LOCATIONS[0].indicators,
        locationName || INITIAL_LOCATIONS[0].city
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to compute recommendations' });
    }
  });

  // Executive AI Narrative Report using Gemini
  app.post('/api/ai-analysis', async (req, res) => {
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

      res.json({
        isAiGenerated: true,
        ...parsed,
      });
    } catch (error: any) {
      console.error('Gemini AI analysis error:', error);
      res.json({
        isAiGenerated: false,
        executiveSummary: `گزارش تحلیل راهبردی بودجه CSR برای منطقه هدف بر اساس داده‌های منطقه‌ای آماده شد.`,
        keyTakeaways: [
          `تمرکز بودجه بر ۲ اولویت اصلی آسیب‌های اجتماعی و حاشیه‌نشینی معطوف است.`,
          `تخصیص متوازن اعتبارات خرد باعث ارتقای سرمایه اجتماعی شرکت در جامعه محلی می‌گردد.`,
        ],
        strategicAdvice: `تصویب برنامه تخصیص پیشنهادی در هیئت مدیره و درج آن در گزارش پایداری سالانه شرکتی.`,
      });
    }
  });

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
