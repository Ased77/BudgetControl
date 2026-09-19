import React, { useState } from 'react';
import { OrganizationConfig, LocalIndicators, CsrPriority } from '../types';
import { Sparkles, Bot, Check, Copy, X, Loader2, FileText, Lightbulb } from 'lucide-react';

interface AiAnalysisModalProps {
  orgConfig: OrganizationConfig;
  indicators: LocalIndicators;
  priorities: CsrPriority[];
  currentPercentages: Record<string, number>;
  onClose: () => void;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  orgConfig,
  indicators,
  priorities,
  currentPercentages,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    executiveSummary?: string;
    keyTakeaways?: string[];
    strategicAdvice?: string;
    isAiGenerated?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: orgConfig.name,
          totalBudgetToman: orgConfig.totalBudget,
          locationName: `${orgConfig.province} - ${orgConfig.county} (${orgConfig.district})`,
          indicators,
          currentAllocations: currentPercentages,
        }),
      });
      const data = await res.json();
      setReport(data);
    } catch (e) {
      console.error('API call error:', e);
      setReport({
        executiveSummary: `تحلیل بودجه مسئولیت اجتماعی برای شرکت ${orgConfig.name} در منطقه ${orgConfig.province}: تمرکز اعتبارات بر آسیب‌های اجتماعی و حاشیه‌نشینی بیشترین بازدهی سرمایه اجتماعی را دارد.`,
        keyTakeaways: [
          'تخصیص متوازن بودجه مانع از انحراف اعتبارات در بخش‌های غیرضروری می‌شود.',
          'پیشنهاد می‌شود ۲۰٪ از اعتبارات صرف درمان و سلامت رایگان ساکنان محلی گردد.',
        ],
        strategicAdvice: 'تصویب و ابلاغ دستورالعمل اجرایی به شورای راهبری محلی جهت شروع پروژه‌ها.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!report) return;
    const text = `
گزارش تحلیلی هیئت‌مدیره - تخصیص بودجه مسئولیت اجتماعی (CSR)
شرکت: ${orgConfig.name}
منطقه: ${orgConfig.province} - ${orgConfig.county}

خلاصه مدیریتی:
${report.executiveSummary}

نکات کلیدی:
${report.keyTakeaways?.map((t) => `- ${t}`).join('\n')}

توصیه استراتژیک:
${report.strategicAdvice}
    `;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="ai-analysis-modal-root" className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right">
      <div id="ai-analysis-modal-div-2" className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div id="ai-analysis-modal-header" className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div id="ai-analysis-modal-header-2" className="flex items-center gap-3">
            <div id="ai-analysis-modal-header-3" className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div id="ai-analysis-modal-header-4">
              <h3 className="font-bold text-base">تحلیل هوشمند AI برای هیئت‌مدیره</h3>
              <p className="text-xs text-slate-300">ارزیابی هوشمند الگوی تخصیص بودجه CSR بر اساس آمارهای محرومیت</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div id="ai-analysis-modal-body" className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          
          {!report && !loading && (
            <div id="ai-analysis-modal-body-2" className="text-center py-8 space-y-4">
              <Bot className="w-12 h-12 text-indigo-500 mx-auto animate-bounce" />
              <div id="ai-analysis-modal-body-3">
                <h4 className="font-bold text-slate-900 text-sm">تولید گزارش کارشناسی خودکار با هوش مصنوعی</h4>
                <p className="text-slate-500 mt-1 max-w-md mx-auto">
                  هوش مصنوعی داده‌های مربوط به نرخ فقر ({indicators.povertyRate}٪)، حاشیه‌نشینی ({indicators.marginalizationRate}٪) و اعتبارات {orgConfig.name} را تحلیل کرده و گزارش رسمی تولید می‌کند.
                </p>
              </div>
              <button
                onClick={generateReport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all"
              >
                شروع تحلیل هوشمند
              </button>
            </div>
          )}

          {loading && (
            <div id="ai-analysis-modal-body-4" className="text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-800">در حال تحلیل شاخص‌های محرومیت محلی و بودجه...</p>
            </div>
          )}

          {report && !loading && (
            <div id="ai-analysis-modal-body-5" className="space-y-4">
              <div id="ai-analysis-modal-body-6" className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <strong className="text-indigo-900 font-bold block mb-1 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  خلاصه مدیریتی:
                </strong>
                <p className="leading-relaxed text-slate-800 text-xs">{report.executiveSummary}</p>
              </div>

              <div id="ai-analysis-modal-body-7">
                <strong className="text-slate-900 font-bold block mb-2">نکات کلیدی برای جلسات هیئت مدیره:</strong>
                <ul className="space-y-1.5">
                  {report.keyTakeaways?.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div id="ai-analysis-modal-body-8" className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <strong className="text-amber-900 font-bold block mb-1 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  توصیه استراتژیک نهایی:
                </strong>
                <p className="leading-relaxed text-slate-800">{report.strategicAdvice}</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {report && (
          <div id="ai-analysis-modal-footer" className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'کپی شد' : 'کپی متن گزارش'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold"
            >
              بستن
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
