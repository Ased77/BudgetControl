import React from 'react';
import { OrganizationConfig, UserProfile, UserRole } from '../types';
import { formatLargeBudgetPersian, toPersianDigits } from '../utils/numberUtils';
import { Building2, MapPin, ShieldCheck, Download, FileSpreadsheet, FileText, UserCheck, Sparkles, ChevronDown } from 'lucide-react';

interface NavbarProps {
  orgConfig: OrganizationConfig;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onOpenCompanySetup: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onOpenAiModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  orgConfig,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenCompanySetup,
  onExportPdf,
  onExportExcel,
  onOpenAiModal,
}) => {
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo & Org Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                  {orgConfig.name}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                  سامانه تخصیص CSR
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {orgConfig.province} • {orgConfig.county} ({orgConfig.district})
                </span>
                <span className="text-slate-600">•</span>
                <span>دوره {toPersianDigits(orgConfig.fiscalYear)}</span>
              </div>
            </div>
          </div>

          {/* Budget Quick Info Badge */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 backdrop-blur-sm self-start md:self-auto">
            <div className="text-right">
              <div className="text-[11px] text-slate-400">بودجه کل مسئولیت اجتماعی</div>
              <div className="text-sm font-extrabold text-emerald-400 dir-rtl">
                {formatLargeBudgetPersian(orgConfig.totalBudget)}
              </div>
            </div>
            <button
              onClick={onOpenCompanySetup}
              className="mr-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-600 transition-colors"
            >
              ویرایش
            </button>
          </div>

          {/* Actions & User Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            
            <button
              onClick={onOpenAiModal}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>تحلیل هوشمند AI</span>
            </button>

            {/* Export Menu */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={onExportPdf}
                title="دانلود گزارش رسمی PDF"
                className="flex items-center gap-1 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">گزارش PDF</span>
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={onExportExcel}
                title="خروجی Excel / CSV"
                className="flex items-center gap-1 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">خروجی اکسل</span>
              </button>
            </div>

            {/* User Role Selector */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 transition-colors"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-blue-400/40"
                />
                <div className="text-right hidden lg:block">
                  <div className="font-medium text-slate-200">{currentUser.name}</div>
                  <div className="text-[10px] text-blue-300">{currentUser.roleTitleFa}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-2 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-700 text-slate-400 font-semibold text-[11px]">
                    تغییر نقش کاربری (تست دسترسی‌ها)
                  </div>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSwitchUser(u);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full text-right px-3 py-2 flex items-center gap-2.5 hover:bg-slate-700/70 transition-colors ${
                        u.id === currentUser.id ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-300'
                      }`}
                    >
                      <img src={u.avatar} className="w-7 h-7 rounded-full object-cover" alt={u.name} />
                      <div className="flex-1">
                        <div>{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.roleTitleFa}</div>
                      </div>
                      {u.id === currentUser.id && <ShieldCheck className="w-4 h-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
