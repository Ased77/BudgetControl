import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { CrisisHarmItem, UrgencyLevel, AdministrativeLevel } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { PageHeader } from './PageHeader';
import RubberSegment from './RubberSegment/RubberSegment';
import CometDial from './CometDial/CometDial';
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Flame,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Edit,
  Trash2,
  X,
  Activity,
  Gauge,
  ShieldCheck,
  FolderGit2,
  ListChecks,
} from 'lucide-react';
import { formatMoneyParts, formatPercent, formatNumber, formatToman, toPersianDigits } from '../utils/numberUtils';
import { gaugeTone } from '../utils/gaugeTone';
import { gaugeStaggerDelay } from '../utils/gaugeStagger';
import { Num } from './Num';
import { AnimatedGauge } from './AnimatedGauge';
import { PROJECT_STATUS_META } from '../utils/projectStatusMeta';
import { useConfirmDelete } from './ConfirmDeleteModal';
import AnimatedContent from './AnimatedContent/AnimatedContent';

/**
 * Card gauge geometry — a 56px frame with the stroke centred on a 22px radius,
 * which leaves room for the six-pixel stroke and its round cap. It is the same
 * frame the departments page draws its absorption ring in, so the metric strips
 * of the two pages line up when they sit side by side.
 */
const GAUGE_RADIUS = 22;
/** Radius of the enlarged gauge that heads the drill-down modal. */
const DETAIL_GAUGE_RADIUS = 32;

/**
 * Order of the urgency chip strip — worst first. Mirrors the `UrgencyLevel`
 * union the add/edit form uses, so the chips and the form agree on what "first"
 * means.
 */
const URGENCY_ORDER: UrgencyLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Per-urgency visual identity: icon, emblem tile, badge tint and the active
 * filter chip, shaped like `DEPARTMENT_CATEGORY_STYLE` in DepartmentsView so a
 * "state of a record" looks the same on both pages. It deliberately carries no
 * ring token: the gauge colour reports the severity score itself and is derived
 * at render time, never the urgency.
 */
const URGENCY_STYLE: Record<
  UrgencyLevel,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tile: string;
    soft: string;
    chip: string;
  }
> = {
  CRITICAL: {
    label: 'بحرانی و فوری',
    icon: Flame,
    tile: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400',
    soft: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    chip: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/25',
  },
  HIGH: {
    label: 'شدت بالا',
    icon: AlertTriangle,
    tile: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    chip: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/25',
  },
  MEDIUM: {
    label: 'شدت متوسط',
    icon: Gauge,
    tile: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    soft: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    chip: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25',
  },
  LOW: {
    label: 'قابل پایش',
    icon: ShieldCheck,
    tile: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    chip: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/25',
  },
};

const ADMIN_LEVEL_LABELS: Record<AdministrativeLevel, string> = {
  NATIONAL: 'ملی / کشوری',
  PROVINCIAL: 'استانی',
  COUNTY: 'شهرستانی',
  RURAL_DISTRICT: 'بخشداری / دهیاری',
};

/*
 * Severity rings read on the shared higher-is-worse gauge scale (see
 * `utils/gaugeTone`): ≥ ۷۰ rose, ۵۰–۶۹ amber, below ۵۰ emerald. The score —
 * how deprived the area is, a health reading — drives the colour, not the
 * row's urgency, exactly as the departments absorption ring follows the
 * absorbed share rather than the department's category.
 */

/**
 * Status pill for a crisis — label, icon and tint from one helper, because the
 * card's meta row and the drill-down header both show it and a crisis under
 * intervention must never look unresolved in one of them. The number of
 * projects tied to the record is part of the label while it is being worked on.
 */
function crisisStatusMeta(status: CrisisHarmItem['status'], projectCount: number) {
  if (status === 'UNDER_INTERVENTION') {
    return {
      icon: Clock,
      label: `پروژه فعال (${toPersianDigits(projectCount)})`,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    };
  }
  if (status === 'CONTROLLED') {
    return {
      icon: CheckCircle2,
      label: 'مهار شده',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    };
  }
  return {
    icon: AlertCircle,
    label: 'بدون مداخله',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  };
}

export const CrisesHarmsView: React.FC = () => {
  const {
    crisesHarms,
    projects,
    selectedLocation,
    handleAddCrisisHarm,
    handleUpdateCrisisHarm,
    handleDeleteCrisisHarm,
    setActiveTab,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingCrisis, setEditingCrisis] = useState<CrisisHarmItem | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Read-only drill-down of a single crisis — the record's own page, opened from
  // its card. Cause, intervention and the linked projects live here rather than
  // on the grid, which is what keeps the grid scannable.
  const [detailCrisis, setDetailCrisis] = useState<CrisisHarmItem | null>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailModalRef, () => setDetailCrisis(null));

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('زیرساخت و آب شرب');
  const [formLevel, setFormLevel] = useState<AdministrativeLevel>('COUNTY');
  const [formProvince, setFormProvince] = useState(selectedLocation.province);
  const [formCounty, setFormCounty] = useState(selectedLocation.county);
  const [formDistrict, setFormDistrict] = useState(selectedLocation.district);
  const [formSeverity, setFormSeverity] = useState<number>(85);
  const [formUrgency, setFormUrgency] = useState<UrgencyLevel>('CRITICAL');
  const [formAffectedPop, setFormAffectedPop] = useState<number>(45000);
  const [formCause, setFormCause] = useState('');
  const [formSolution, setFormSolution] = useState('');
  const [formStatus, setFormStatus] = useState<CrisisHarmItem['status']>('UNRESOLVED');
  const [formDeficitIndex, setFormDeficitIndex] = useState('');

  const userPerm = getUserPermissions(currentUser);
  // SYSTEM_ADMIN bypass — same rule as the server's requirePermission; the
  // seeded matrix deliberately excluded crises editing from this role, but the
  // full-system-access directive supersedes the row.
  const canManage = currentUser.role === 'SYSTEM_ADMIN' || (userPerm ? userPerm.canManageCrises : true);

  const handleOpenAdd = () => {
    setEditingCrisis(null);
    setFormTitle('');
    setFormCode(`CRS-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategory('زیرساخت و آب شرب');
    setFormLevel('COUNTY');
    setFormProvince(selectedLocation.province);
    setFormCounty(selectedLocation.county);
    setFormDistrict(selectedLocation.district);
    setFormSeverity(85);
    setFormUrgency('CRITICAL');
    setFormAffectedPop(40000);
    setFormCause('');
    setFormSolution('');
    setFormStatus('UNRESOLVED');
    setFormDeficitIndex('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CrisisHarmItem) => {
    setEditingCrisis(item);
    setFormTitle(item.title);
    setFormCode(item.code);
    setFormCategory(item.category);
    setFormLevel(item.level);
    setFormProvince(item.province);
    setFormCounty(item.county);
    setFormDistrict(item.districtOrVillage);
    setFormSeverity(item.severityScore);
    setFormUrgency(item.urgency);
    setFormAffectedPop(item.affectedPopulation);
    setFormCause(item.primaryCause);
    setFormSolution(item.recommendedIntervention);
    setFormStatus(item.status);
    setFormDeficitIndex(item.deficitIndexFa);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingCrisis) {
      handleUpdateCrisisHarm({
        ...editingCrisis,
        title: formTitle.trim(),
        code: formCode.trim(),
        category: formCategory.trim(),
        level: formLevel,
        province: formProvince.trim(),
        county: formCounty.trim(),
        districtOrVillage: formDistrict.trim(),
        severityScore: Number(formSeverity),
        urgency: formUrgency,
        affectedPopulation: Number(formAffectedPop),
        primaryCause: formCause.trim(),
        recommendedIntervention: formSolution.trim(),
        status: formStatus,
        deficitIndexFa: formDeficitIndex.trim() || formCategory,
      });
    } else {
      handleAddCrisisHarm({
        title: formTitle.trim(),
        code: formCode.trim(),
        category: formCategory.trim(),
        level: formLevel,
        province: formProvince.trim(),
        county: formCounty.trim(),
        districtOrVillage: formDistrict.trim(),
        severityScore: Number(formSeverity),
        urgency: formUrgency,
        affectedPopulation: Number(formAffectedPop),
        primaryCause: formCause.trim(),
        recommendedIntervention: formSolution.trim(),
        status: formStatus,
        activeProjectsCount: 0,
        deficitIndexFa: formDeficitIndex.trim() || formCategory,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered Crises
  const filteredCrises = useMemo(() => {
    return crisesHarms.filter((c) => {
      const matchQ =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.districtOrVillage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchUrg = selectedUrgency === 'ALL' || c.urgency === selectedUrgency;
      const matchStat = selectedStatus === 'ALL' || c.status === selectedStatus;
      return matchQ && matchUrg && matchStat;
    });
  }, [crisesHarms, searchQuery, selectedUrgency, selectedStatus]);

  // Aggregate stats — the four numbers that head the page
  const criticalCount = useMemo(() => crisesHarms.filter((c) => c.urgency === 'CRITICAL').length, [crisesHarms]);
  const totalAffected = useMemo(() => crisesHarms.reduce((s, c) => s + c.affectedPopulation, 0), [crisesHarms]);
  const underInterventionCount = useMemo(
    () => crisesHarms.filter((c) => c.status === 'UNDER_INTERVENTION').length,
    [crisesHarms]
  );

  // Urgency distribution drives the chip strip: a chip for an urgency no record
  // carries would only be a filter that can never match.
  const urgencyCounts = useMemo(() => {
    const counts: Partial<Record<UrgencyLevel, number>> = {};
    crisesHarms.forEach((c) => {
      counts[c.urgency] = (counts[c.urgency] || 0) + 1;
    });
    return counts;
  }, [crisesHarms]);

  // Options for the urgency Rubber Segment — worst first, and only the levels
  // some record actually carries, since a segment no record matches would only
  // ever empty the page. `ALL` keeps the total so the strip always shows scale.
  const urgencyFilterItems = useMemo(
    () => [
      { value: 'ALL', label: `همه سطوح (${toPersianDigits(crisesHarms.length)})` },
      ...URGENCY_ORDER.filter((urgency) => (urgencyCounts[urgency] || 0) > 0).map((urgency) => ({
        value: urgency,
        label: `${URGENCY_STYLE[urgency].label} (${toPersianDigits(urgencyCounts[urgency] || 0)})`,
      })),
    ],
    [crisesHarms.length, urgencyCounts]
  );

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedUrgency('ALL');
    setSelectedStatus('ALL');
  };

  const kpiCards = [
    {
      id: 'total',
      label: 'کل موارد ثبت‌شده',
      figure: { value: formatNumber(crisesHarms.length), unit: 'مورد' },
      icon: ListChecks,
      card: 'border-cyan-200 dark:border-cyan-900/70 bg-cyan-50/40 dark:bg-cyan-950/20',
      tile: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
      valueClass: 'text-cyan-800 dark:text-cyan-300',
    },
    {
      id: 'critical',
      label: 'کانون‌های بحرانی',
      figure: { value: formatNumber(criticalCount), unit: 'کانون' },
      icon: Flame,
      card: 'border-rose-200 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/20',
      tile: 'bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
      valueClass: 'text-rose-800 dark:text-rose-300',
    },
    {
      id: 'affected',
      label: 'جمعیت متأثر',
      figure: { value: formatNumber(totalAffected), unit: 'نفر' },
      icon: Users,
      card: 'border-amber-200 dark:border-amber-900/70 bg-amber-50/40 dark:bg-amber-950/20',
      tile: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      valueClass: 'text-amber-800 dark:text-amber-300',
    },
    {
      id: 'intervention',
      label: 'در حال مداخله',
      figure: { value: formatNumber(underInterventionCount), unit: 'مورد' },
      icon: FolderGit2,
      card: 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/40 dark:bg-emerald-950/20',
      tile: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
      valueClass: 'text-emerald-800 dark:text-emerald-300',
    },
  ];

  return (
    <AnimatedContent
      id="crises-harms-view-root"
      className="space-y-5"
      container="#app-scrollable-main-workspace"
      distance={24}
      duration={0.5}
      ease="power2.out"
      stagger={0.06}
      threshold={0.05}
    >
      <PageHeader
        id="crises-harms-view-page-header"
        icon={AlertTriangle}
        title="آسیب‌ها، بحران‌ها و نیازسنجی محلی / منطقه‌ای"
        subtitle={`${toPersianDigits(crisesHarms.length)} مورد ثبت‌شده — ${toPersianDigits(criticalCount)} کانون بحرانی و ${formatNumber(totalAffected)} نفر جمعیت متأثر در ${selectedLocation.province} - ${selectedLocation.county}`}
        tone="text-rose-600"
      >
        {canManage && (
          <button
            id="btn-add-crisis"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-rose-600/25 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت آسیب یا بحران جدید</span>
          </button>
        )}
      </PageHeader>

      {/* Macro KPI Cards — totals across every registered crisis and harm */}
      <AnimatedContent
        id="crises-harms-view-kpi-cards"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        container="#app-scrollable-main-workspace"
        distance={24}
        duration={0.5}
        ease="power2.out"
        stagger={0.06}
        threshold={0.05}
      >
        {kpiCards.map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div
              id={`crises-harms-view-kpi-card-${kpi.id}`}
              key={kpi.id}
              className={`rounded-2xl border p-4 shadow-2xs flex items-center gap-3 ${kpi.card}`}
            >
              <div
                id={`crises-harms-view-kpi-card-tile-${kpi.id}`}
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${kpi.tile}`}
              >
                <KpiIcon className="w-5 h-5" />
              </div>
              <div id={`crises-harms-view-kpi-card-body-${kpi.id}`} className="min-w-0">
                <Num
                  value={kpi.figure.value}
                  unit={kpi.figure.unit}
                  className={`block text-base font-black leading-tight truncate ${kpi.valueClass}`}
                />
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</span>
              </div>
            </div>
          );
        })}
      </AnimatedContent>

      {/* Toolbar — search and the status/urgency filters */}
      <div
        id="crises-harms-view-toolbar"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 space-y-3"
      >
        <div id="crises-harms-view-toolbar-top-row" className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div id="crises-harms-view-toolbar-search-group" className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div id="crises-harms-view-search-input" className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجوی عنوان بحران، محدوده یا دسته..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

          </div>

          <div id="crises-harms-view-toolbar-actions" className="flex items-center gap-2 flex-wrap">
            <div id="crises-harms-view-status-filter" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>وضعیت مداخله:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="ALL">همه وضعیت‌ها</option>
                <option value="UNRESOLVED">حل نشده / بدون پروژه</option>
                <option value="UNDER_INTERVENTION">تحت مداخله با پروژه فعال</option>
                <option value="CONTROLLED">مهار شده / تثبیت وضعیت</option>
              </select>
            </div>

            <div
              id="crises-harms-view-urgency-filter"
              className="flex items-center gap-1.5 min-w-0 max-w-full text-xs text-slate-500 dark:text-slate-400"
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">سطح فوریت:</span>
              <div
                id="crises-harms-view-urgency-chips"
                className="min-w-0 max-w-full overflow-x-auto scrollbar-none py-0.5"
              >
                <RubberSegment
                  aria-label="سطح فوریت"
                  items={urgencyFilterItems}
                  value={selectedUrgency}
                  defaultValue="ALL"
                  onChange={setSelectedUrgency}
                  size="sm"
                  radius={999}
                  equalSlots={false}
                  draggable
                  trackColor="var(--crisis-seg-track)"
                  thumbColor="var(--crisis-seg-thumb)"
                  textColor="var(--crisis-seg-ink)"
                  activeTextColor="var(--crisis-seg-ink-active)"
                  className="w-max [--crisis-seg-track:#f1f5f9] [--crisis-seg-thumb:#e11d48] [--crisis-seg-ink:#475569] [--crisis-seg-ink-active:#ffffff] dark:[--crisis-seg-track:#1e293b] dark:[--crisis-seg-thumb:#fb7185] dark:[--crisis-seg-ink:#cbd5e1] dark:[--crisis-seg-ink-active:#0f172a]"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Crises Grid — every card is a door into the record's own page, so the
          grid only has to carry the identity, the state and three numbers. */}
      {filteredCrises.length > 0 ? (
        <AnimatedContent
          id="crises-harms-view-crises-grid"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          container="#app-scrollable-main-workspace"
          distance={24}
          duration={0.5}
          ease="power2.out"
          stagger={0.06}
          threshold={0.05}
        >
          {filteredCrises.map((item, index) => {
            const gaugeDelayMs = gaugeStaggerDelay(index);
            const style = URGENCY_STYLE[item.urgency];
            const UrgencyIcon = style.icon;
            const matchedProjects = projects.filter((p) => p.crisisHarmId === item.id);
            const status = crisisStatusMeta(item.status, matchedProjects.length);
            const StatusIcon = status.icon;

            return (
              <article
                id={`crises-harms-view-card-${item.id}`}
                key={item.id}
                onClick={() => setDetailCrisis(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailCrisis(item);
                  }
                }}
                title="کلیک برای مشاهده جزئیات بحران"
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                {/* Identity — the urgency emblem over the crisis title. The badge
                    spells the urgency out and the muted chip carries the subject
                    area, so the two never have to be told apart by colour alone. */}
                <div
                  id={`crises-harms-view-card-identity-${item.id}`}
                  className="p-5 pb-4 flex flex-col items-center text-center"
                >
                  <div
                    id={`crises-harms-view-card-emblem-${item.id}`}
                    className={`w-20 h-20 rounded-2xl border flex items-center justify-center shrink-0 ${style.tile}`}
                  >
                    <UrgencyIcon className="w-10 h-10" />
                  </div>

                  <div id={`crises-harms-view-card-title-${item.id}`} className="flex items-start justify-center gap-1 mt-3 w-full min-w-0">
                    <h3
                      className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight min-w-0 line-clamp-2 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                    <span
                      id={`crises-harms-view-card-urgency-${item.id}`}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${style.soft}`}
                    >
                      {style.label}
                    </span>
                    <span
                      id={`crises-harms-view-card-category-${item.id}`}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                    >
                      {item.category}
                    </span>
                  </div>

                  <div
                    id={`crises-harms-view-card-meta-${item.id}`}
                    className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500 dark:text-slate-400 w-full min-w-0"
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate" title={`${item.province} - ${item.county} (${item.districtOrVillage})`}>
                        {item.county} ({item.districtOrVillage})
                      </span>
                    </span>
                    <span
                      id={`crises-harms-view-card-status-${item.id}`}
                      className={`flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full font-bold ${status.className}`}
                    >
                      <StatusIcon className="w-3 h-3 shrink-0" />
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Three-metric strip: severity gauge / affected population / active projects */}
                <div
                  id={`crises-harms-view-card-metrics-${item.id}`}
                  className="mt-auto grid grid-cols-3 items-stretch border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 rounded-b-2xl"
                >
                  <div
                    id={`crises-harms-view-card-gauge-${item.id}`}
                    className="flex items-center justify-center py-3"
                  >
                    <AnimatedGauge
                      value={item.severityScore}
                      radius={GAUGE_RADIUS}
                      toneClassName={gaugeTone(item.severityScore, 'HIGHER_IS_WORSE')}
                      className="w-14 h-14"
                      delayMs={gaugeDelayMs}
                    >
                      <span className="absolute inset-0 flex flex-col items-center justify-center">
                        <Num
                          value={formatNumber(item.severityScore)}
                          countUpDelayMs={gaugeDelayMs}
                          className="text-sm font-black text-slate-800 dark:text-slate-100 leading-none"
                        />
                        <span className="text-[9px] text-slate-400 mt-0.5">٪</span>
                      </span>
                    </AnimatedGauge>
                  </div>

                  <div
                    id={`crises-harms-view-card-population-metric-${item.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 border-x border-slate-100 dark:border-slate-800 text-center"
                  >
                    <Num value={formatNumber(item.affectedPopulation)} className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      نفر متأثر
                    </span>
                  </div>

                  <div
                    id={`crises-harms-view-card-projects-metric-${item.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 text-center"
                  >
                    <Num value={formatNumber(matchedProjects.length)} className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none" />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <FolderGit2 className="w-3 h-3 text-slate-400" />
                      پروژه فعال
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </AnimatedContent>
      ) : (
        <div
          id="crises-harms-view-empty-state"
          className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800"
        >
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">هیچ بحران یا آسیبی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 mt-1">لطفاً عبارت جستجو یا فیلترهای خود را تغییر دهید.</p>
          <button
            id="btn-reset-crisis-filters"
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            پاک‌سازی جستجو و فیلترها
          </button>
        </div>
      )}

      {/* Crisis Drill-down Modal — the record's own page: readings, the two prose
          panels and the projects that answer it. */}
      {detailCrisis &&
        (() => {
          const style = URGENCY_STYLE[detailCrisis.urgency];
          const UrgencyIcon = style.icon;
          const matchedProjects = projects.filter((p) => p.crisisHarmId === detailCrisis.id);
          const status = crisisStatusMeta(detailCrisis.status, matchedProjects.length);
          const StatusIcon = status.icon;

          return (
            <div
              id="crises-harms-view-detail-modal"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <div
                id="crises-harms-view-detail-modal-panel"
                ref={detailModalRef}
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div
                  id="crises-harms-view-detail-modal-header"
                  className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      id="crises-harms-view-detail-modal-icon"
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${style.tile}`}
                    >
                      <UrgencyIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{detailCrisis.code}</span>
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">
                        {detailCrisis.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.soft}`}>
                          {style.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${status.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {detailCrisis.province} - {detailCrisis.county}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    id="btn-close-crisis-details"
                    onClick={() => setDetailCrisis(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    title="بستن"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div id="crises-harms-view-detail-modal-body" className="p-5 space-y-4 text-xs">
                  {/* Assessment panel — the severity gauge beside the readings
                      that qualify it, the same shape the departments page gives
                      its budget absorption. */}
                  <div
                    id="crises-harms-view-detail-modal-assessment"
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-rose-500" />
                        شاخص‌های سنجش بحران
                      </span>
                      <span className="text-[10px] text-slate-400">ارزیابی نیازسنجی محلی</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <AnimatedGauge
                        value={detailCrisis.severityScore}
                        radius={DETAIL_GAUGE_RADIUS}
                        center={40}
                        strokeWidth={8}
                        toneClassName={gaugeTone(detailCrisis.severityScore, 'HIGHER_IS_WORSE')}
                        className="w-20 h-20 shrink-0"
                      >
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                          <Num value={formatNumber(detailCrisis.severityScore)} className="text-sm font-black text-slate-800 dark:text-slate-100" />
                          <span className="text-[9px] text-slate-400">٪</span>
                        </span>
                      </AnimatedGauge>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">جمعیت متأثر</span>
                          <Num value={formatNumber(detailCrisis.affectedPopulation)} unit="نفر" className="font-black text-slate-900 dark:text-slate-100" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">پروژه‌های در حال اجرا</span>
                          <Num value={formatNumber(matchedProjects.length)} unit="پروژه" className="font-bold text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">شاخص کمبود محلی</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate" title={detailCrisis.deficitIndexFa}>
                            {detailCrisis.deficitIndexFa}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Identity and scope */}
                  <div id="crises-harms-view-detail-modal-facts" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      id="crises-harms-view-detail-modal-fact-category"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Flame className="w-3.5 h-3.5" />
                        دسته آسیب و موضوع
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailCrisis.category}</span>
                    </div>
                    <div
                      id="crises-harms-view-detail-modal-fact-level"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Gauge className="w-3.5 h-3.5" />
                        سطح اداری
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {ADMIN_LEVEL_LABELS[detailCrisis.level]}
                      </span>
                    </div>
                    <div
                      id="crises-harms-view-detail-modal-fact-location"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                        محدوده ثبت‌شده
                      </span>
                      <span
                        className="font-bold text-slate-800 dark:text-slate-200 truncate"
                        title={`${detailCrisis.province} - ${detailCrisis.county} (${detailCrisis.districtOrVillage})`}
                      >
                        {detailCrisis.county} ({detailCrisis.districtOrVillage})
                      </span>
                    </div>
                    <div
                      id="crises-harms-view-detail-modal-fact-status"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Activity className="w-3.5 h-3.5" />
                        وضعیت مداخله
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Cause */}
                  <div id="crises-harms-view-detail-modal-cause">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      ریشه و علت اصلی
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-900/40">
                      {detailCrisis.primaryCause}
                    </p>
                  </div>

                  {/* Intervention */}
                  <div id="crises-harms-view-detail-modal-intervention">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      مداخله و راهکار پیشنهادی
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl p-3 border border-emerald-200/50 dark:border-emerald-900/40">
                      {detailCrisis.recommendedIntervention}
                    </p>
                  </div>

                  {/* Linked projects */}
                  <div id="crises-harms-view-detail-modal-projects">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                        پروژه‌های پاسخ‌دهنده به این بحران
                      </span>
                      <span className="text-[10px] text-slate-400">
                        <Num value={formatNumber(matchedProjects.length)} unit="پروژه" unitClassName="text-[0.9em] font-bold text-slate-400 ms-0.5" /> ثبت‌شده
                      </span>
                    </div>

                    {matchedProjects.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">
                          هنوز پروژه‌ای برای مداخله در این بحران ثبت نشده است.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {matchedProjects.map((proj) => (
                          <div
                            id={`crises-harms-view-detail-modal-project-${proj.id}`}
                            key={proj.id}
                            className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono text-slate-400 block">{proj.code}</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-tight block">
                                  {proj.title}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${
                                  PROJECT_STATUS_META[proj.status].className
                                }`}
                              >
                                {PROJECT_STATUS_META[proj.status].label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    proj.progressPercentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(100, proj.progressPercentage)}%` }}
                                />
                              </div>
                              <Num value={formatPercent(proj.progressPercentage)} className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-9 text-left shrink-0" />
                              <Num {...formatMoneyParts(proj.estimatedCostToman)} className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  id="crises-harms-view-detail-modal-footer"
                  className="sticky bottom-0 flex items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    شناسه سیستمی: {detailCrisis.code}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      id="btn-open-crisis-projects"
                      type="button"
                      onClick={() => {
                        setDetailCrisis(null);
                        setActiveTab('PROJECTS');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      پروژه‌ها
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                    {canManage && (
                      <button
                        id="btn-edit-crisis-from-details"
                        type="button"
                        onClick={() => {
                          const target = detailCrisis;
                          setDetailCrisis(null);
                          handleOpenEdit(target);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        ویرایش مشخصات
                      </button>
                    )}
                    {canManage && (
                      <button
                        id="btn-delete-crisis-from-details"
                        type="button"
                        onClick={() => {
                          const target = detailCrisis;
                          setDetailCrisis(null);
                          confirmDelete(
                            `آیا از حذف بحران «${target.title}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`,
                            () => handleDeleteCrisisHarm(target.id)
                          );
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white font-bold text-[11px] hover:bg-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div id="crises-harms-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="crises-harms-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="crises-harms-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                {editingCrisis ? 'ویرایش مشخصات بحران / آسیب محلی' : 'ثبت بحران یا آسیب جدید در سامانه ملی'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="crises-harms-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">عنوان بحران یا آسیب *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: تنش شدید آبی و فرسودگی شبکه آبرسانی روستایی"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div id="crises-harms-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="crises-harms-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کد شناسایی بحران</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="crises-harms-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سطح فوریت و اولویت</label>
                  <select
                    value={formUrgency}
                    onChange={(e) => setFormUrgency(e.target.value as UrgencyLevel)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="CRITICAL">بحرانی و فوری (اقدام عاجل)</option>
                    <option value="HIGH">شدت بالا</option>
                    <option value="MEDIUM">شدت متوسط</option>
                    <option value="LOW">قابل پایش</option>
                  </select>
                </div>
              </div>

              <div id="crises-harms-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="crises-harms-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">دسته آسیب / موضوع</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="آب شرب، راه، بهداشت، اعتیاد..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div id="crises-harms-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">محدوده / روستا / بخش</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    placeholder="مثال: بخش کشکوئیه و دهستان راویز"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div id="crises-harms-view-crud-modal-11" className="grid grid-cols-2 gap-3 items-center">
                <div id="crises-harms-view-crud-modal-12" className="flex flex-col items-center gap-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">شاخص شدت محرومیت (۰-۱۰۰)</label>
                  <CometDial
                    value={formSeverity}
                    onChange={setFormSeverity}
                    min={0}
                    max={100}
                    step={1}
                    unit="٪"
                    format={(v) => formatNumber(v, true, 0)}
                    label="شاخص شدت محرومیت"
                    size={156}
                    thickness={6}
                    accent="var(--crisis-dial-accent)"
                    ink="var(--crisis-dial-ink)"
                    className="[--crisis-dial-accent:#e11d48] [--crisis-dial-ink:#0f172a] dark:[--crisis-dial-accent:#fb7185] dark:[--crisis-dial-ink:#e2e8f0]"
                  />
                </div>
                <div id="crises-harms-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">جمعیت تحت تأثیر مستقیم (نفر)</label>
                  <input
                    type="number"
                    min="1"
                    value={formAffectedPop}
                    onChange={(e) => setFormAffectedPop(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="crises-harms-view-crud-modal-14">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ریشه و علت اصلی معضل</label>
                <textarea
                  rows={2}
                  value={formCause}
                  onChange={(e) => setFormCause(e.target.value)}
                  placeholder="چرا این بحران به وجود آمده و چه عواملی تشدیدش کرده‌اند..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div id="crises-harms-view-crud-modal-15">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">مداخله و پروژه پیشنهادی جهت حل مسئله</label>
                <textarea
                  rows={2}
                  value={formSolution}
                  onChange={(e) => setFormSolution(e.target.value)}
                  placeholder="اقدام فنی، مهندسی یا اجتماعی مورد نیاز..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div id="crises-harms-view-crud-modal-16" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-600/30"
                >
                  {editingCrisis ? 'ذخیره تغییرات' : 'ثبت بحران در سامانه'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmModal}
    </AnimatedContent>
  );
};
