import React, { useMemo, useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  AnalysisSource,
  AnalysisSourceKind,
  AnalysisSourceOrigin,
  AnalysisSourceStatus,
} from '../types';
import { formatNumber, formatPercent, toPersianDigits } from '../utils/numberUtils';
import { Num } from './Num';
import { useConfirmDelete } from './ConfirmDeleteModal';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { PageHeader } from './PageHeader';
import {
  FileSearch,
  Plus,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Newspaper,
  FileText,
  ClipboardList,
  Satellite,
  Mic,
  Share2,
  Bot,
  UserRound,
  Link2,
  CalendarDays,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Gauge,
} from 'lucide-react';

/* Label + colour lookups. Kept local to the page: it is the only consumer. */

const ORIGIN_META: Record<AnalysisSourceOrigin, { label: string; icon: React.ElementType; badge: string }> = {
  AI: {
    label: 'تولید هوش مصنوعی',
    icon: Bot,
    badge: 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
  },
  HUMAN: {
    label: 'منبع انسانی',
    icon: UserRound,
    badge: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
};

const KIND_META: Record<AnalysisSourceKind, { label: string; icon: React.ElementType }> = {
  NEWS: { label: 'خبر و گزارش رسانه‌ای', icon: Newspaper },
  OFFICIAL_STAT: { label: 'آمار و سند رسمی', icon: FileText },
  FIELD_REPORT: { label: 'گزارش میدانی و بازدید', icon: ClipboardList },
  SATELLITE: { label: 'تصویر ماهواره‌ای', icon: Satellite },
  INTERVIEW: { label: 'مصاحبه کارشناسی', icon: Mic },
  SOCIAL_MEDIA: { label: 'رصد فضای مجازی', icon: Share2 },
};

const STATUS_META: Record<AnalysisSourceStatus, { label: string; badge: string }> = {
  PENDING: {
    label: 'در انتظار بازبینی',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
  APPROVED: {
    label: 'تأییدشده',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  REJECTED: {
    label: 'ردشده',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  },
};

/** Reliability ring/bar colour by score band. */
function reliabilityTone(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

export const AnalysisSourcesView: React.FC = () => {
  const {
    analysisSources,
    currentUser,
    getUserPermissions,
    handleAddAnalysisSource,
    handleUpdateAnalysisSource,
    handleReviewAnalysisSource,
    handleDeleteAnalysisSource,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<'ALL' | AnalysisSourceOrigin>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AnalysisSourceStatus>('ALL');
  const [kindFilter, setKindFilter] = useState<'ALL' | AnalysisSourceKind>('ALL');

  // Detail modal holds only the record id so it stays in sync after a review.
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailRef, () => setDetailId(null));
  const detailSource = useMemo(
    () => analysisSources.find((s) => s.id === detailId) || null,
    [analysisSources, detailId]
  );
  const [reviewNote, setReviewNote] = useState('');
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  const openDetail = (source: AnalysisSource) => {
    setReviewNote(source.reviewNote ?? '');
    setDetailId(source.id);
  };

  // Add / edit form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  useOutsideClick(formRef, () => setIsFormOpen(false));
  const [editingSource, setEditingSource] = useState<AnalysisSource | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formOrigin, setFormOrigin] = useState<AnalysisSourceOrigin>('AI');
  const [formKind, setFormKind] = useState<AnalysisSourceKind>('NEWS');
  const [formProvider, setFormProvider] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formPublishedAt, setFormPublishedAt] = useState('');
  const [formAreas, setFormAreas] = useState('');
  const [formReliability, setFormReliability] = useState(75);

  const userPerm = getUserPermissions(currentUser);
  const canManage = userPerm ? userPerm.canApproveProjects : currentUser.role === 'SYSTEM_ADMIN';

  const openAdd = () => {
    setEditingSource(null);
    setFormTitle('');
    setFormSummary('');
    setFormOrigin('AI');
    setFormKind('NEWS');
    setFormProvider('');
    setFormUrl('');
    setFormPublishedAt('');
    setFormAreas('');
    setFormReliability(75);
    setIsFormOpen(true);
  };

  const openEdit = (source: AnalysisSource) => {
    setEditingSource(source);
    setFormTitle(source.title);
    setFormSummary(source.summary);
    setFormOrigin(source.origin);
    setFormKind(source.kind);
    setFormProvider(source.provider);
    setFormUrl(source.sourceUrl ?? '');
    setFormPublishedAt(source.publishedAt);
    setFormAreas(source.linkedAreas.join('، '));
    setFormReliability(source.reliabilityScore);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const linkedAreas = formAreas
      .split(/[،,]/)
      .map((a) => a.trim())
      .filter(Boolean);

    if (editingSource) {
      handleUpdateAnalysisSource({
        ...editingSource,
        title: formTitle.trim(),
        summary: formSummary.trim(),
        origin: formOrigin,
        kind: formKind,
        provider: formProvider.trim(),
        sourceUrl: formUrl.trim() || undefined,
        publishedAt: formPublishedAt.trim(),
        linkedAreas,
        reliabilityScore: Math.max(0, Math.min(100, Number(formReliability) || 0)),
      });
    } else {
      handleAddAnalysisSource({
        title: formTitle.trim(),
        summary: formSummary.trim(),
        origin: formOrigin,
        kind: formKind,
        provider: formProvider.trim(),
        sourceUrl: formUrl.trim() || undefined,
        publishedAt: formPublishedAt.trim(),
        linkedAreas,
        reliabilityScore: Math.max(0, Math.min(100, Number(formReliability) || 0)),
        province: currentUser.province ?? 'خوزستان',
        county: currentUser.county ?? 'شهرستان امیدیه',
      });
    }
    setIsFormOpen(false);
  };

  const filteredSources = useMemo(() => {
    return analysisSources.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchQ =
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.provider.toLowerCase().includes(q) ||
        s.linkedAreas.some((a) => a.toLowerCase().includes(q));
      const matchOrigin = originFilter === 'ALL' || s.origin === originFilter;
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      const matchKind = kindFilter === 'ALL' || s.kind === kindFilter;
      return matchQ && matchOrigin && matchStatus && matchKind;
    });
  }, [analysisSources, searchQuery, originFilter, statusFilter, kindFilter]);

  const stats = useMemo(
    () => ({
      total: analysisSources.length,
      approved: analysisSources.filter((s) => s.status === 'APPROVED').length,
      pending: analysisSources.filter((s) => s.status === 'PENDING').length,
      ai: analysisSources.filter((s) => s.origin === 'AI').length,
    }),
    [analysisSources]
  );

  return (
    <div id="analysis-sources-view-root" className="space-y-6">
      <PageHeader
        id="analysis-sources-view-page-header"
        icon={FileSearch}
        title="منابع داده و اطلاعات موتور تحلیل"
        subtitle="ثبت، بازبینی و تأیید داده‌ها و اخبار ورودی تحلیل (تولید هوش مصنوعی یا انسانی)"
        tone="text-violet-600"
      />

      {/* Banner — section label, add action and the micro-KPI strip. */}
      <div id="analysis-sources-view-header-banner" className="bg-gradient-to-r from-violet-50/90 via-indigo-50/70 to-slate-50 rounded-2xl p-6 text-slate-900 border border-violet-200/80 shadow-2xs relative overflow-hidden">
        <div id="analysis-sources-view-header-banner-2" className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div id="analysis-sources-view-header-banner-3" className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
              شفافیت داده‌های ورودی و چرخه تأیید انسانی
            </span>
          </div>

          {canManage && (
            <button
              id="btn-add-analysis-source"
              onClick={openAdd}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-violet-600/25 transition-all hover:scale-105 active:scale-95 self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت منبع تحلیل جدید</span>
            </button>
          )}
        </div>

        <div id="analysis-sources-view-micro-kpi-strip" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-violet-200/60">
          <div id="analysis-sources-view-micro-kpi-strip-1" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">کل منابع ثبت‌شده</span>
            <Num value={formatNumber(stats.total)} unit="منبع" className="text-xl font-black text-slate-900 mt-0.5 block font-mono" />
          </div>
          <div id="analysis-sources-view-micro-kpi-strip-2" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">منابع تأییدشده</span>
            <Num value={formatNumber(stats.approved)} unit="منبع" className="text-xl font-black text-emerald-700 mt-0.5 block font-mono" />
          </div>
          <div id="analysis-sources-view-micro-kpi-strip-3" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">در انتظار بازبینی</span>
            <Num value={formatNumber(stats.pending)} unit="منبع" className="text-xl font-black text-amber-700 mt-0.5 block font-mono" />
          </div>
          <div id="analysis-sources-view-micro-kpi-strip-4" className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 block">تولید هوش مصنوعی</span>
            <span className="text-xl font-black text-violet-700 mt-0.5 block flex items-center gap-1 font-mono">
              <Bot className="w-4 h-4 text-violet-600" />
              <Num value={formatNumber(stats.ai)} unit="منبع" unitClassName="text-[0.6em] font-bold text-violet-700 ms-1" />
            </span>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div id="analysis-sources-view-filter-bar" className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="جستجوی عنوان، خلاصه، ارائه‌دهنده یا محور تحلیل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>فیلترها:</span>
          </div>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value as 'ALL' | AnalysisSourceOrigin)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">همه منابع (AI و انسانی)</option>
            <option value="AI">تولید هوش مصنوعی</option>
            <option value="HUMAN">منبع انسانی</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | AnalysisSourceStatus)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">همه وضعیت‌های بازبینی</option>
            <option value="PENDING">در انتظار بازبینی</option>
            <option value="APPROVED">تأییدشده</option>
            <option value="REJECTED">ردشده</option>
          </select>

          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as 'ALL' | AnalysisSourceKind)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">همه انواع منبع</option>
            {(Object.keys(KIND_META) as AnalysisSourceKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_META[kind].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sources list */}
      {filteredSources.length > 0 ? (
        <div id="analysis-sources-view-list" className="grid grid-cols-3 gap-4">
          {filteredSources.map((source) => {
            const origin = ORIGIN_META[source.origin];
            const kind = KIND_META[source.kind];
            const status = STATUS_META[source.status];
            const KindIcon = kind.icon;
            const OriginIcon = origin.icon;

            return (
              <article
                id={`analysis-sources-view-card-${source.id}`}
                key={source.id}
                onClick={() => openDetail(source)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetail(source);
                  }
                }}
                title="کلیک برای مشاهده جزئیات و بازبینی"
                className="group bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-800 cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                      <KindIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block">{kind.label}</span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors" title={source.title}>
                        {source.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${status.badge}`}>
                      {status.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 whitespace-nowrap ${origin.badge}`}>
                      <OriginIcon className="w-3 h-3" />
                      {source.origin === 'AI' ? 'AI' : 'انسانی'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-violet-500" />
                      اعتبار منبع
                    </span>
                    <Num value={formatPercent(source.reliabilityScore)} className="font-bold text-slate-800 dark:text-slate-200" />
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${reliabilityTone(source.reliabilityScore)}`}
                      style={{ width: `${source.reliabilityScore}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1.5 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400 min-w-0">
                      {source.origin === 'AI' ? <Bot className="w-3.5 h-3.5 shrink-0" /> : <UserRound className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{source.provider}</span>
                    </span>
                    <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-bold shrink-0 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                      جزئیات
                      <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div id="analysis-sources-view-empty" className="flex flex-col items-center justify-center gap-2 py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
          <span className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
            <FileSearch className="w-5 h-5 text-slate-500" />
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-300 font-bold">منبعی با این فیلترها یافت نشد.</span>
          <span className="text-xs text-slate-400">فیلترها را تغییر دهید یا منبع تحلیل جدیدی ثبت کنید.</span>
        </div>
      )}

      {/* Detail modal — full record with review, edit and delete */}
      {detailSource && (
        <div
          id="analysis-sources-view-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div
            ref={detailRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="analysis-sources-view-detail-modal-title"
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  {(() => {
                    const KindIcon = KIND_META[detailSource.kind].icon;
                    return <KindIcon className="w-6 h-6" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block">{KIND_META[detailSource.kind].label}</span>
                  <h3 id="analysis-sources-view-detail-modal-title" className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">
                    {detailSource.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_META[detailSource.status].badge}`}>
                      {STATUS_META[detailSource.status].label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${ORIGIN_META[detailSource.origin].badge}`}>
                      {React.createElement(ORIGIN_META[detailSource.origin].icon, { className: 'w-3 h-3' })}
                      {ORIGIN_META[detailSource.origin].label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {detailSource.province} - {detailSource.county}
                    </span>
                  </div>
                </div>
              </div>
              <button
                id="btn-close-analysis-source-details"
                onClick={() => setDetailId(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Provider + dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                    {detailSource.origin === 'AI' ? <Bot className="w-3.5 h-3.5 text-violet-500" /> : <UserRound className="w-3.5 h-3.5 text-sky-500" />}
                    ارائه‌دهنده
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailSource.provider}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                    تاریخ انتشار / گردآوری
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{detailSource.publishedAt}</span>
                </div>
              </div>

              {/* Reliability */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-violet-500" />
                    امتیاز اعتبار و اتکاپذیری منبع
                  </span>
                  <Num value={formatNumber(detailSource.reliabilityScore)} unit="٪" className="font-bold text-slate-800 dark:text-slate-200" />
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${reliabilityTone(detailSource.reliabilityScore)}`} style={{ width: `${detailSource.reliabilityScore}%` }} />
                </div>
                {detailSource.reliabilityScore < 60 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    اعتبار پایین — پیش از استناد نیازمند منابع تکمیلی است.
                  </span>
                )}
              </div>

              {/* Linked analysis areas */}
              <div>
                <span className="text-slate-400 text-[11px] flex items-center gap-1 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  محورهای تحلیلی مصرف‌کننده این منبع
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {detailSource.linkedAreas.length > 0 ? (
                    detailSource.linkedAreas.map((area) => (
                      <span key={area} className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {area}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-[11px]">محوری ثبت نشده است.</span>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">خلاصه نقش این منبع در تحلیل</span>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  {detailSource.summary || 'خلاصه‌ای برای این منبع ثبت نشده است.'}
                </p>
              </div>

              {/* Source link */}
              {detailSource.sourceUrl && (
                <a
                  href={detailSource.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300 hover:underline"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  مشاهده منبع اصلی
                </a>
              )}

              {/* Review record */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    سابقه بازبینی انسانی
                  </span>
                  {detailSource.reviewedBy && (
                    <span className="text-[10px] text-slate-400">بازبین: {detailSource.reviewedBy}</span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {detailSource.reviewNote || 'این منبع هنوز بازبینی و اظهارنظر کارشناسی نشده است.'}
                </p>
              </div>

              {/* Reviewer note input */}
              {canManage && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">یادداشت بازبینی (اختیاری)</label>
                  <textarea
                    rows={2}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="دلیل تأیید، رد یا شرط استناد به این منبع..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-mono truncate">شناسه سیستمی: {detailSource.id}</span>

              {canManage && (
                <div className="flex items-center gap-2 flex-wrap">
                  {detailSource.status !== 'APPROVED' && (
                    <button
                      id="btn-approve-analysis-source"
                      type="button"
                      onClick={() => handleReviewAnalysisSource(detailSource.id, 'APPROVED', reviewNote.trim() || undefined)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تأیید منبع
                    </button>
                  )}
                  {detailSource.status !== 'REJECTED' && (
                    <button
                      id="btn-reject-analysis-source"
                      type="button"
                      onClick={() => handleReviewAnalysisSource(detailSource.id, 'REJECTED', reviewNote.trim() || undefined)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      رد منبع
                    </button>
                  )}
                  {detailSource.status !== 'PENDING' && (
                    <button
                      id="btn-reopen-analysis-source"
                      type="button"
                      onClick={() => handleReviewAnalysisSource(detailSource.id, 'PENDING', reviewNote.trim() || undefined)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      بازگشت به بررسی
                    </button>
                  )}
                  <button
                    id="btn-edit-analysis-source"
                    type="button"
                    onClick={() => {
                      const target = detailSource;
                      setDetailId(null);
                      openEdit(target);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    ویرایش
                  </button>
                  <button
                    id="btn-delete-analysis-source"
                    type="button"
                    onClick={() => {
                      const target = detailSource;
                      setDetailId(null);
                      confirmDelete(
                        `آیا از حذف منبع تحلیل «${target.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
                        () => handleDeleteAnalysisSource(target.id)
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / edit modal */}
      {isFormOpen && (
        <div id="analysis-sources-view-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            ref={formRef}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[92vh]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-violet-500" />
                {editingSource ? 'ویرایش منبع تحلیل' : 'ثبت منبع تحلیل جدید'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">عنوان منبع *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: رصد خبری تنش آبی روستاهای بخش جایزان"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ماهیت تولیدکننده *</label>
                  <select
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value as AnalysisSourceOrigin)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    <option value="AI">تولید هوش مصنوعی</option>
                    <option value="HUMAN">منبع انسانی</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نوع منبع *</label>
                  <select
                    value={formKind}
                    onChange={(e) => setFormKind(e.target.value as AnalysisSourceKind)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  >
                    {(Object.keys(KIND_META) as AnalysisSourceKind[]).map((kind) => (
                      <option key={kind} value={kind}>
                        {KIND_META[kind].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ارائه‌دهنده / مرجع *</label>
                  <input
                    type="text"
                    required
                    value={formProvider}
                    onChange={(e) => setFormProvider(e.target.value)}
                    placeholder="نام مدل هوش مصنوعی یا سازمان و شخص"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">تاریخ انتشار / گردآوری</label>
                  <input
                    type="text"
                    value={formPublishedAt}
                    onChange={(e) => setFormPublishedAt(e.target.value)}
                    placeholder="۱۴۰۴/۰۵/۱۲"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نشانی منبع اصلی</label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">امتیاز اعتبار (۰ تا ۱۰۰)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formReliability}
                    onChange={(e) => setFormReliability(Number(e.target.value))}
                    className="w-full mt-2 accent-violet-600"
                  />
                  <span className="text-[11px] text-slate-500 font-bold"><Num value={formatNumber(formReliability)} unit="٪" unitClassName="text-[0.85em] font-bold text-slate-500 ms-0.5" /></span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">محورهای تحلیلی مصرف‌کننده (با «،» جدا کنید)</label>
                <input
                  type="text"
                  value={formAreas}
                  onChange={(e) => setFormAreas(e.target.value)}
                  placeholder="اولویت‌های توسعه، بحران‌ها و آسیب‌ها"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">خلاصه نقش این منبع در تحلیل</label>
                <textarea
                  rows={3}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="این منبع چه داده‌ای را وارد تحلیل می‌کند و چگونه به تصمیم کمک می‌کند؟"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold shadow-lg shadow-violet-600/30"
                >
                  {editingSource ? 'ذخیره تغییرات' : 'ثبت منبع تحلیل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmModal}
    </div>
  );
};
