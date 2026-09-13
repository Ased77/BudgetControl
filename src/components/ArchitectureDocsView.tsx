import React, { useState } from 'react';
import { Database, Server, Code, Cpu, LineChart, FileCode, Copy, Check, Terminal } from 'lucide-react';

export const ArchitectureDocsView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sqlSchemaCode = `-- ================================================================
-- DATABASE SCHEMA: CSR Smart Budgeting & Local Allocation System
-- PostgreSQL / PostGIS Compatible Schema Definition
-- ================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50) NOT NULL CHECK (org_type IN ('GOVERNMENT', 'PUBLIC', 'PRIVATE', 'SEMI_PRIVATE')),
    activity_sector VARCHAR(100),
    national_code VARCHAR(20),
    province VARCHAR(100) NOT NULL,
    county VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    total_budget_toman NUMERIC(20, 2) NOT NULL,
    currency_unit VARCHAR(10) DEFAULT 'TOMAN',
    fiscal_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE location_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    province VARCHAR(100) NOT NULL,
    county VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    poverty_rate NUMERIC(5, 2) DEFAULT 0, -- 0 to 100%
    marginalization_rate NUMERIC(5, 2) DEFAULT 0,
    unemployment_rate NUMERIC(5, 2) DEFAULT 0,
    social_harms_index NUMERIC(5, 2) DEFAULT 0,
    vulnerable_groups_population INT DEFAULT 0,
    infrastructure_deficit NUMERIC(5, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE csr_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code INT UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    default_percentage NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    priority_id UUID REFERENCES csr_priorities(id),
    allocated_percentage NUMERIC(5, 2) NOT NULL,
    allocated_toman NUMERIC(20, 2) NOT NULL,
    allocated_rial NUMERIC(20, 2) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    priority_title VARCHAR(255),
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    rationale TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`;

  const backendEndpointCode = `// Express.js Backend API Endpoint for CSR Budget Calculation
import express from 'express';
const router = express.Router();

router.post('/api/calculate', (req, res) => {
  const { totalBudgetToman, allocations } = req.body;
  
  if (!totalBudgetToman || totalBudgetToman <= 0) {
    return res.status(400).json({ error: 'مبلغ بودجه کل نامعتبر است' });
  }

  let totalAllocatedToman = 0;
  let sumPercentage = 0;

  const items = Object.entries(allocations).map(([priorityId, pct]) => {
    const percentage = Number(pct) || 0;
    sumPercentage += percentage;
    const amountToman = Math.round((totalBudgetToman * percentage) / 100);
    const amountRial = amountToman * 10;
    totalAllocatedToman += amountToman;

    return {
      priorityId,
      percentage,
      amountToman,
      amountRial
    };
  });

  res.json({
    totalBudgetToman,
    totalBudgetRial: totalBudgetToman * 10,
    sumPercentage: Math.round(sumPercentage * 10) / 10,
    totalAllocatedToman,
    unallocatedToman: totalBudgetToman - totalAllocatedToman,
    isValid100Pct: Math.abs(100 - sumPercentage) < 0.1,
    items
  });
});`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto text-right">
      
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-600" />
          مستندات معماری، پایگاه داده و الگوریتم هوشمند سامانه CSR
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          ارائه جزئیات فنی دیاگرام معماری، طرح دیتابیس PostgreSQL، کد اندپوینت بک‌اند و فرمول ریاضی پیشنهاد هوشمند
        </p>
      </div>

      {/* 1. Overall System Architecture Diagram */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-600" />
          ۱. دیاگرام معماری کلی سامانه (C4 Level 2 Component Architecture)
        </h3>

        <div className="bg-slate-950 text-slate-200 p-5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed dir-ltr border border-slate-800">
          <pre className="text-blue-300">
{`+-----------------------------------------------------------------------------------+
|                                FRONTEND LAYER (React 19)                           |
|  +---------------------+  +----------------------+  +---------------------------+ |
|  | Priority Table      |  | Interactive Charts   |  | Location Indicators Map   | |
|  | (Slider, Locks)     |  | (Recharts Pie/Radar) |  | (Province & County Data)  | |
|  +----------+----------+  +----------+-----------+  +-------------+-------------+ |
+-------------|------------------------|----------------------------|---------------+
              |                        |                            |
              +------------------------+----------------------------+
                                       | HTTP JSON / REST API
                                       v
+-----------------------------------------------------------------------------------+
|                                BACKEND LAYER (Node.js / Express)                  |
|  +------------------------+  +------------------------+  +----------------------+ |
|  | Allocation Calculator  |  | Smart Recommendation   |  | Gemini AI Analysis   | |
|  | (/api/calculate)       |  | Engine Algorithm       |  | Proxy Integration    | |
|  +-----------+------------+  +-----------+------------+  +----------+-----------+ |
+--------------|---------------------------|--------------------------|-------------+
               |                           |                          |
               v                           v                          v
+-----------------------------+  +-------------------------+  +---------------------+
| PostgreSQL Database         |  | Regional Indicators DB  |  | Google Gemini AI API|
| (Drizzle ORM / PostGIS)     |  | (Statistics Center API) |  | (@google/genai SDK) |
+-----------------------------+  +-------------------------+  +---------------------+`}
          </pre>
        </div>
      </div>

      {/* 2. Database Schema (PostgreSQL) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            ۲. طرح پایگاه داده (PostgreSQL / Drizzle Schema SQL)
          </h3>
          <button
            onClick={() => copyToClipboard(sqlSchemaCode, 'sql')}
            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
          >
            {copiedKey === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>کپی اسکریپت SQL</span>
          </button>
        </div>

        <div className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto dir-ltr border border-slate-800">
          <pre>{sqlSchemaCode}</pre>
        </div>
      </div>

      {/* 3. Backend Endpoint Implementation Code */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-600" />
            ۳. نمونه کد اندپوینت بک‌اند (Express API Endpoint)
          </h3>
          <button
            onClick={() => copyToClipboard(backendEndpointCode, 'backend')}
            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
          >
            {copiedKey === 'backend' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>کپی کد TypeScript</span>
          </button>
        </div>

        <div className="bg-slate-950 text-amber-300 p-4 rounded-2xl font-mono text-xs overflow-x-auto dir-ltr border border-slate-800">
          <pre>{backendEndpointCode}</pre>
        </div>
      </div>

      {/* 4. Smart Recommendation Formula */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Terminal className="w-5 h-5 text-purple-600" />
          ۴. فرمول ریاضی و مدل امتیازدهی موتور پیشنهاد هوشمند
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          امتیاز خام اولیه هر اولویت $S_p$ بر اساس ترکیب خطی وزن‌دار شاخص‌های آماری محرومیت منطقه محاسبه می‌شود:
        </p>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono text-slate-800 dir-ltr">
          <div>S_1 (آسیب‌های اجتماعی) = 0.5 * SocialHarms + 0.3 * PovertyRate + 0.2 * DropOutRate</div>
          <div>S_2 (حاشیه‌نشینی) = 0.55 * Marginalization + 0.25 * PovertyRate + 0.20 * InfrastructureDeficit</div>
          <div>S_3 (آموزش) = 0.50 * DropOutRate + 0.30 * PovertyRate + 0.20 * CulturalDeficit</div>
          <div>S_4 (بهداشت) = 0.45 * HealthAccessDeficit + 0.35 * EnvironmentalRisk + 0.20 * VulnerablePopNorm</div>
          <div>...</div>
          <div className="pt-2 text-purple-700 font-bold border-t border-slate-200">
            Normalized_Percentage_P = ( S_P / SUM(S_1 ... S_N) ) * 100
          </div>
        </div>
      </div>

      {/* 5. Future Roadmap & Integration Expansion */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">۵. نقشه راه توسعه و اتصال به سرویس‌های بیرونی</h3>
        <ul className="list-disc list-inside text-xs text-slate-600 space-y-2 leading-relaxed">
          <li><strong>اتصال به API مرکز آمار و استانداری‌ها:</strong> فراخوانی اتوماتیک آمار فقر و حاشیه‌نشینی بر اساس کد ملی منطقه.</li>
          <li><strong>ماژول ارزیابی اثر (Impact Assessment):</strong> سنجش میزان کاهش واقعی نرخ آسیب‌های اجتماعی پس از تخصیص و اجرای پروژه.</li>
          <li><strong>نقشه حرارتی GIS و مکان‌محور:</strong> نمایش گرافیکی میزان تراکم اعتبارات CSR روی نقشه ماهواره‌ای استان.</li>
        </ul>
      </div>

    </div>
  );
};
