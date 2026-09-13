import React, { useState } from 'react';
import { CsrPriority } from '../types';
import { generateBasicCsv, generateExtendedCsv, downloadCsvFile, parseCsvPriorities } from '../utils/csvHandler';
import { FileSpreadsheet, Download, Upload, Check, AlertCircle, X, Shield, Sliders } from 'lucide-react';

interface CsvManagerModalProps {
  priorities: CsrPriority[];
  onImportPriorities: (imported: CsrPriority[]) => void;
  onClose: () => void;
}

export const CsvManagerModal: React.FC<CsvManagerModalProps> = ({
  priorities,
  onImportPriorities,
  onClose,
}) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDownloadBasic = () => {
    const csvContent = generateBasicCsv(priorities);
    downloadCsvFile('csr_priorities_fa.csv', csvContent);
  };

  const handleDownloadExtended = () => {
    const csvContent = generateExtendedCsv(priorities);
    downloadCsvFile('csr_priorities_fa_extended.csv', csvContent);
  };

  const handleFileChange = (file: File) => {
    setImportError(null);
    setImportSuccess(null);

    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('excel')) {
      setImportError('لطفاً یک فایل با پسوند .csv معتبر انتخاب کنید.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setImportError('محتوای فایل خالی است.');
          return;
        }

        const parsed = parseCsvPriorities(text, priorities);
        if (parsed.length === 0) {
          setImportError('ساختار فایل CSV معتبر نیست یا هیچ سطری یافت نشد.');
          return;
        }

        onImportPriorities(parsed);
        setImportSuccess(`با موفقیت تعداد ${parsed.length} اولویت مسئولیت اجتماعی بارگذاری و به‌روزرسانی شد.`);
      } catch (err) {
        console.error(err);
        setImportError('خطا در خواندن و پردازش فایل CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right dir-rtl">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">مدیریت فایل‌های CSV اولویت‌ها</h3>
              <p className="text-xs text-slate-400">دانلود نسخه‌های اولیه و پیشرفته یا ایمپورت فایل سفارشی</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          
          {/* Download CSV Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              دانلود فایل‌های پیش‌فرض CSV
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Basic CSV Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3 hover:border-blue-300 transition-all">
                <div>
                  <div className="font-bold text-slate-900 text-xs mb-1">
                    فایل اولیه: <span className="font-mono text-blue-700">csr_priorities_fa.csv</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    شامل ۴ ستون اصلی (شناسه، عنوان، درصد پیش‌فرض، شرح کوتاه).
                  </p>
                </div>
                <button
                  onClick={handleDownloadBasic}
                  className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-3 rounded-lg text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>دانلود CSV پایه</span>
                </button>
              </div>

              {/* Extended CSV Card */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between space-y-3 hover:border-blue-400 transition-all">
                <div>
                  <div className="font-bold text-slate-900 text-xs mb-1 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" />
                    فایل پیشرفته: <span className="font-mono text-blue-700">csr_priorities_fa_extended.csv</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    شامل ۸ ستون پیشرفته (ضریب وزن، فعال/غیرفعال، حداقل و حداکثر درصد).
                  </p>
                </div>
                <button
                  onClick={handleDownloadExtended}
                  className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود CSV پیشرفته</span>
                </button>
              </div>

            </div>
          </div>

          {/* Import Drag & Drop Zone */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              بارگذاری / ایمپورت فایل CSV به سامانه
            </h4>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                dragActive ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50'
              }`}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-xs">
                فایل CSV اولویت‌ها را کشیده و اینجا رها کنید
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                یا برای انتخاب فایل کلیک کنید (سازگار با هر دو فرمت پایه و پیشرفته)
              </p>
              <input
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="csv-file-upload-input"
              />
              <label
                htmlFor="csv-file-upload-input"
                className="inline-block mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-xs transition-colors"
              >
                انتخاب فایل CSV
              </label>
            </div>

            {importSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          {/* Guide Note */}
          <div className="p-3.5 bg-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed border border-slate-200">
            <strong>راهنمای ایمپورت:</strong> ستون‌های پذیرفته شده عبارتند از <code className="text-blue-700">priority_id</code>، <code className="text-blue-700">title</code>، <code className="text-blue-700">default_percent</code>، <code className="text-blue-700">description</code>، <code className="text-blue-700">weight_factor</code>، <code className="text-blue-700">is_active</code>، <code className="text-blue-700">min_percent</code> و <code className="text-blue-700">max_percent</code>.
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
