import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { CsrPriority } from '../types';
import { formatToman, roundPercentage } from '../utils/numberUtils';
import {
  ListChecks,
  Plus,
  Search,
  Filter,
  Lock,
  Unlock,
  Sparkles,
  RotateCcw,
  Scale,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  X,
  Target,
  Coins,
} from 'lucide-react';

export const PrioritiesView: React.FC = () => {
  const {
    priorities,
    currentPercentages,
    lockedIds,
    orgConfig,
    recommendations,
    selectedLocation,
    handlePercentageChange,
    handleToggleLock,
    handleApplySmartRecommendations,
    handleResetToDefault,
    handleAutoRebalance,
    handleAddPriority,
    handleUpdatePriority,
    handleDeletePriority,
    handleAddSubItem,
    handleDeleteSubItem,
    currentUser,
    rolesPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedSubItemId, setExpandedSubItemId] = useState<string | null>(null);
  const [newSubItemText, setNewSubItemText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState<CsrPriority | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('عمران و زیرساخت');
  const [formDescription, setFormDescription] = useState('');
  const [formDefaultPct, setFormDefaultPct] = useState<number>(10);

  const userPerm = rolesPermissions.find((r) => r.role === currentUser.role);
  const canEdit = userPerm ? userPerm.canEditPriorities : currentUser.role === 'ADMIN';

  // Sum of percentages
  const currentSum = useMemo(() => {
    return roundPercentage(
      (Object.values(currentPercentages) as number[]).reduce((a, b) => a + b, 0)
    );
  }, [currentPercentages]);

  const isExact100 = Math.abs(currentSum - 100) < 0.01;

  // Filtered
  const filteredPriorities = useMemo(() => {
    return priorities.filter((p) => {
      const matchQ =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchQ && matchCat;
    });
  }, [priorities, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    return Array.from(new Set(priorities.map((p) => p.category)));
  }, [priorities]);

  const handleOpenAdd = () => {
    setEditingPriority(null);
    setFormTitle('');
    setFormCategory('عمران و زیرساخت');
    setFormDescription('');
    setFormDefaultPct(10);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: CsrPriority) => {
    setEditingPriority(p);
    setFormTitle(p.title);
    setFormCategory(p.category);
    setFormDescription(p.description);
    setFormDefaultPct(p.defaultPercentage);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingPriority) {
      handleUpdatePriority({
        ...editingPriority,
        title: formTitle.trim(),
        category: formCategory.trim(),
        description: formDescription.trim(),
        defaultPercentage: Number(formDefaultPct),
      });
    } else {
      handleAddPriority(formTitle.trim(), formCategory.trim(), formDescription.trim(), Number(formDefaultPct));
    }
    setIsModalOpen(false);
  };

  const handleAddSub = (pId: string) => {
    if (!newSubItemText.trim()) return;
    handleAddSubItem(pId, newSubItemText.trim());
    setNewSubItemText('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner (Light Theme) */}
      <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-purple-200/80 shadow-2xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-purple-600" />
                ماتریس هوشمند اولویت‌های توسعه
              </span>
              <span className="text-xs text-slate-500">انطباق زنده با شاخص‌های محرومیت {selectedLocation.province} ({selectedLocation.county})</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <ListChecks className="w-7 h-7 text-purple-600" />
              اولویت‌ها و ضرایب وزنی تخصیص بودجه
            </h1>
            <p className="text-slate-600 text-sm mt-1 max-w-3xl leading-relaxed">
              تنظیم درصدهای تخصیص به بخش‌های حیاتی (آبرسانی، بهداشت، راه‌سازی، اشتغال و آموزش). الگوریتم هوشمند با تغییر منطقه،
              بر اساس داده‌های واقعی محرومیت همان نقطه، پیشنهاد وزنی ارائه داده و امکان قفل‌گذاری و تراز آنی ۱۰۰٪ را فراهم می‌کند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={handleApplySmartRecommendations}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-purple-600/25 transition-all hover:scale-105 active:scale-95"
              title="پیشنهاد هوشمند هوش مصنوعی بر اساس محرومیت منطقه"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>پیشنهاد هوشمند AI</span>
            </button>

            <button
              onClick={handleAutoRebalance}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 shadow-2xs transition-colors"
              title="تراز خودکار روی ۱۰۰٪"
            >
              <Scale className="w-3.5 h-3.5 text-purple-600" />
              <span>تراز ۱۰۰٪</span>
            </button>

            <button
              onClick={handleResetToDefault}
              className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-300 shadow-2xs transition-colors"
              title="بازنشانی به پیش‌فرض"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {canEdit && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-purple-600/25"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن اولویت</span>
              </button>
            )}
          </div>
        </div>

        {/* Sum Indicator Strip */}
        <div className="mt-5 pt-4 border-t border-purple-200/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500 font-semibold">مجموع درصدهای تخصیص فعلی:</span>
            <span
              className={`font-black font-mono text-base px-3 py-1 rounded-lg ${
                isExact100
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
              }`}
            >
              {currentSum}٪
            </span>
            {!isExact100 && (
              <span className="text-rose-700 font-medium text-[11px] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {currentSum > 100 ? `${(currentSum - 100).toFixed(1)}٪ بیش از سقف!` : `${(100 - currentSum).toFixed(1)}٪ کمتر از کل`}
              </span>
            )}
            {isExact100 && (
              <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تخصیص کاملاً منطبق بر ۱۰۰٪ بودجه
              </span>
            )}
          </div>

          <div className="text-xs text-slate-400 font-mono">
            کل بودجه محاسباتی: <span className="text-white font-bold">{formatToman(orgConfig.totalBudget)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی عنوان اولویت، شرح یا دسته..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>دسته‌بندی:</span>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">همه دسته‌ها ({priorities.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Priorities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPriorities.map((p) => {
          const currentPct = currentPercentages[p.id] || 0;
          const isLocked = lockedIds.has(p.id);
          const allocatedToman = (orgConfig.totalBudget * currentPct) / 100;
          const aiRecPct = recommendations.scores[p.id] || 0;
          const isExpanded = expandedSubItemId === p.id;

          return (
            <div
              key={p.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                isLocked
                  ? 'border-indigo-400/80 dark:border-indigo-600/60 bg-indigo-50/10 dark:bg-indigo-950/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">اولویت کد #{p.code}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight">{p.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleLock(p.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isLocked
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-600'
                      }`}
                      title={isLocked ? 'قفل درصد باز شود' : 'قفل کردن درصد در تراز خودکار'}
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {p.category}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">{p.description}</p>

                {/* Slider and Percentage Display */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80 mb-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">درصد تخصیص فعلی:</span>
                    <div className="flex items-center gap-2">
                      {aiRecPct > 0 && (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                          (پیشنهاد AI: {aiRecPct}٪)
                        </span>
                      )}
                      <span className="font-black text-sm font-mono text-purple-700 dark:text-purple-300">
                        {currentPct}٪
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={p.minPercent || 1}
                    max={p.maxPercent || 60}
                    step="0.5"
                    disabled={isLocked}
                    value={currentPct}
                    onChange={(e) => handlePercentageChange(p.id, parseFloat(e.target.value))}
                    className="w-full accent-purple-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer disabled:opacity-50"
                  />

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Coins className="w-3 h-3 text-purple-500" />
                      بودجه متناظر ریالی:
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {formatToman(allocatedToman)}
                    </span>
                  </div>
                </div>

                {/* Sub-items accordion */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mb-3">
                  <button
                    onClick={() => setExpandedSubItemId(isExpanded ? null : p.id)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <FolderTree className="w-3.5 h-3.5 text-purple-500" />
                      زیرمجموعه‌ها و اقدامات فرعی ({p.subItems?.length || 0})
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && (
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      {p.subItems && p.subItems.length > 0 ? (
                        <div className="space-y-1.5">
                          {p.subItems.map((sub, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg text-[11px]"
                            >
                              <span className="text-slate-700 dark:text-slate-300">{sub}</span>
                              {canEdit && (
                                <button
                                  onClick={() => handleDeleteSubItem(p.id, idx)}
                                  className="text-slate-400 hover:text-rose-500 p-0.5"
                                  title="حذف زیرمجموعه"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 text-center py-1">هیچ زیرمجموعه‌ای تعریف نشده است.</p>
                      )}

                      {canEdit && (
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <input
                            type="text"
                            placeholder="افزودن اقدام فرعی جدید..."
                            value={newSubItemText}
                            onChange={(e) => setNewSubItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSub(p.id);
                              }
                            }}
                            className="flex-1 px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => handleAddSub(p.id)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold"
                          >
                            افزودن
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 text-xs">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="ویرایش اولویت"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeletePriority(p.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="حذف اولویت"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                {editingPriority ? 'ویرایش مشخصات اولویت توسعه' : 'افزودن اولویت توسعه جدید'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">عنوان اولویت توسعه *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: نوسازی و ارتقای بهداشت و درمان روستایی"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">دسته‌بندی اصلی</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="زیرساخت، بهداشت، آموزش..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">درصد پیش‌فرض (٪)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formDefaultPct}
                    onChange={(e) => setFormDefaultPct(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شرح و اهداف توسعه‌ای</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="دلایل ضرورت و خروجی‌های هدف‌گذاری شده در منطقه..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30"
                >
                  {editingPriority ? 'ذخیره تغییرات' : 'ثبت اولویت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
