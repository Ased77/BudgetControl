import React, { useState, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { Department, AdministrativeLevel, ProjectStatus } from '../types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  User,
  Edit,
  Trash2,
  Award,
  FolderGit2,
  X,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Gauge,
  Wallet,
  Banknote,
  Coins,
  MapPin,
  ListChecks,
  Upload,
  HeartPulse,
  GraduationCap,
  HeartHandshake,
  Sprout,
  Leaf,
  Landmark,
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../utils/numberUtils';
import { HelpTooltip } from './HelpTooltip';
import { useConfirmDelete } from './ConfirmDeleteModal';

/** Departments rendered per page of the card grid. */
const PAGE_SIZE = 6;
const BILLION_TOMAN = 1_000_000_000;
const GAUGE_RADIUS = 22;
/** Longest edge a stored logo is downscaled to before being saved. */
const LOGO_MAX_EDGE = 256;
const LOGO_MAX_SOURCE_BYTES = 5 * 1024 * 1024;

const ADMIN_LEVEL_LABELS: Record<AdministrativeLevel, string> = {
  NATIONAL: 'ملی / کشوری',
  PROVINCIAL: 'استانی',
  COUNTY: 'شهرستانی',
  RURAL_DISTRICT: 'بخشداری / دهیاری',
};

/**
 * Order of the category chip strip — mirrors the `Department['category']`
 * union order used by the add/edit form dropdown.
 */
const CATEGORY_ORDER: Department['category'][] = [
  'INFRASTRUCTURE',
  'HEALTH',
  'EDUCATION',
  'SOCIAL_WELFARE',
  'AGRICULTURE',
  'ENVIRONMENT',
  'MUNICIPAL_RURAL',
];

/**
 * Per-category visual identity: icon plus the tint triples used by the card
 * icon tile, the category badge, the active filter chip and the absorption
 * gauge ring. Mirrors the `PROJECT_CATEGORIES` shape in CreateProjectView so
 * both pictures of a "category" stay recognisable side by side.
 */
const DEPARTMENT_CATEGORY_STYLE: Record<
  Department['category'],
  {
    icon: React.ComponentType<{ className?: string }>;
    tile: string;
    soft: string;
    chip: string;
    ring: string;
  }
> = {
  INFRASTRUCTURE: {
    icon: Building2,
    tile: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
    soft: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    chip: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25',
    ring: 'stroke-blue-500 dark:stroke-blue-400',
  },
  HEALTH: {
    icon: HeartPulse,
    tile: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400',
    soft: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    chip: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/25',
    ring: 'stroke-rose-500 dark:stroke-rose-400',
  },
  EDUCATION: {
    icon: GraduationCap,
    tile: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400',
    soft: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    chip: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/25',
    ring: 'stroke-indigo-500 dark:stroke-indigo-400',
  },
  SOCIAL_WELFARE: {
    icon: HeartHandshake,
    tile: 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400',
    soft: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    chip: 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-600/25',
    ring: 'stroke-violet-500 dark:stroke-violet-400',
  },
  AGRICULTURE: {
    icon: Sprout,
    tile: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    chip: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/25',
    ring: 'stroke-emerald-500 dark:stroke-emerald-400',
  },
  ENVIRONMENT: {
    icon: Leaf,
    tile: 'bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400',
    soft: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    chip: 'bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/25',
    ring: 'stroke-teal-500 dark:stroke-teal-400',
  },
  MUNICIPAL_RURAL: {
    icon: Landmark,
    tile: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    chip: 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/25',
    ring: 'stroke-amber-500 dark:stroke-amber-400',
  },
};

/** Status pill colours for the linked-project rows of the detail modal. */
const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  PROPOSED: {
    label: 'پیشنهادی',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  APPROVED: {
    label: 'مصوب',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  IN_PROGRESS: {
    label: 'در حال اجرا',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  COMPLETED: {
    label: 'تکمیل‌شده',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  SUSPENDED: {
    label: 'متوقف',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
};

/**
 * Reads an image file into a downscaled PNG data URL, so a logo can be stored
 * inside the department payload without a dedicated upload endpoint or a
 * request body large enough to slow every save down.
 */
function readLogoAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('فقط فایل تصویری (PNG، JPG، WebP یا SVG) مجاز است.'));
      return;
    }
    if (file.size > LOGO_MAX_SOURCE_BYTES) {
      reject(new Error('حجم تصویر لوگو باید کمتر از ۵ مگابایت باشد.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خواندن فایل تصویر ممکن نشد.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('تصویر انتخاب‌شده قابل پردازش نیست.'));
      image.onload = () => {
        const scale = Math.min(1, LOGO_MAX_EDGE / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('پردازش تصویر در این مرورگر پشتیبانی نمی‌شود.'));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Splits a Toman amount into a compact `{ number, unit }` pair so card metric
 * cells can print "۵۲" large with "میلیارد" as a small unit underneath,
 * the way the budget cells of the design do. Decimals go through the same
 * `fa-IR` locale formatting `formatToman` uses, so the separator (٫) matches
 * the rest of the system.
 */
const compactNumber = (value: number): string =>
  toPersianDigits(value.toLocaleString('fa-IR', { maximumFractionDigits: 2 }));

function compactBudget(amountInToman: number): { value: string; unit: string } {
  if (!amountInToman || isNaN(amountInToman)) return { value: '۰', unit: 'تومان' };

  // The unit stays currency-free: the card's figures row prints the amount in
  // Tomans, and a short unit keeps this narrow cell on a single line.
  if (amountInToman >= 1_000 * BILLION_TOMAN) {
    return { value: compactNumber(amountInToman / (1_000 * BILLION_TOMAN)), unit: 'هزار میلیارد' };
  }
  if (amountInToman >= BILLION_TOMAN) {
    return { value: compactNumber(amountInToman / BILLION_TOMAN), unit: 'میلیارد' };
  }
  return { value: compactNumber(amountInToman / 1_000_000), unit: 'میلیون' };
}

export const DepartmentsView: React.FC = () => {
  const {
    departments,
    projects,
    handleAddDepartment,
    handleUpdateDepartment,
    handleDeleteDepartment,
    currentUser,
    getUserPermissions,
  } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(modalRef, () => setIsModalOpen(false));
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const { confirmDelete, modal: deleteConfirmModal } = useConfirmDelete();

  // Read-only drill-down of a single department
  const [detailDept, setDetailDept] = useState<Department | null>(null);
  const detailModalRef = useRef<HTMLDivElement>(null);
  useOutsideClick(detailModalRef, () => setDetailDept(null));

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState<Department['category']>('INFRASTRUCTURE');
  const [formCategoryFa, setFormCategoryFa] = useState('زیرساخت و عمران');
  const [formHeadName, setFormHeadName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAllocated, setFormAllocated] = useState<number>(500_000_000_000);
  const [formAbsorbed, setFormAbsorbed] = useState<number>(200_000_000_000);
  const [formScore, setFormScore] = useState<number>(85);
  const [formLevel, setFormLevel] = useState<AdministrativeLevel>('COUNTY');
  const [formProvince, setFormProvince] = useState('کرمان');
  const [formCounty, setFormCounty] = useState('شهرستان رفسنجان');
  const [formDesc, setFormDesc] = useState('');
  const [formLogoDataUrl, setFormLogoDataUrl] = useState('');
  const [formLogoError, setFormLogoError] = useState<string | null>(null);

  // Check user permission
  const userPerm = getUserPermissions(currentUser);
  const canEdit = userPerm ? userPerm.canEditDepartments : currentUser.role === 'ADMIN';

  // Category mapping
  const categoryLabels: Record<Department['category'], string> = {
    INFRASTRUCTURE: 'زیرساخت و عمران',
    HEALTH: 'بهداشت و درمان',
    EDUCATION: 'آموزش و پرورش',
    SOCIAL_WELFARE: 'حمایت اجتماعی و بهزیستی',
    AGRICULTURE: 'کشاورزی و منابع طبیعی',
    ENVIRONMENT: 'محیط زیست',
    MUNICIPAL_RURAL: 'امور دهیاری‌ها و شهری',
  };

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormName('');
    setFormCode(`DEP-${Math.floor(100 + Math.random() * 900)}`);
    setFormCategory('INFRASTRUCTURE');
    setFormCategoryFa('زیرساخت و عمران');
    setFormHeadName('');
    setFormPhone('');
    setFormEmail('');
    setFormAllocated(500_000_000_000);
    setFormAbsorbed(0);
    setFormScore(85);
    setFormLevel('COUNTY');
    setFormProvince('کرمان');
    setFormCounty('شهرستان رفسنجان');
    setFormDesc('');
    setFormLogoDataUrl('');
    setFormLogoError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormCategory(dept.category);
    setFormCategoryFa(dept.categoryFa);
    setFormHeadName(dept.headPersonName);
    setFormPhone(dept.contactNumber);
    setFormEmail(dept.email || '');
    setFormAllocated(dept.allocatedBudgetToman);
    setFormAbsorbed(dept.absorbedBudgetToman);
    setFormScore(dept.performanceScore);
    setFormLevel(dept.administrativeLevel);
    setFormProvince(dept.province);
    setFormCounty(dept.county || 'شهرستان رفسنجان');
    setFormDesc(dept.description);
    setFormLogoDataUrl(dept.logoDataUrl || '');
    setFormLogoError(null);
    setIsModalOpen(true);
  };

  const handleLogoFileChange = async (file: File) => {
    setFormLogoError(null);
    try {
      setFormLogoDataUrl(await readLogoAsDataUrl(file));
    } catch (err) {
      setFormLogoDataUrl('');
      setFormLogoError(err instanceof Error ? err.message : 'خطا در بارگذاری تصویر لوگو.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingDept) {
      handleUpdateDepartment({
        ...editingDept,
        name: formName.trim(),
        code: formCode.trim(),
        category: formCategory,
        categoryFa: categoryLabels[formCategory] || formCategoryFa,
        headPersonName: formHeadName.trim(),
        contactNumber: formPhone.trim(),
        email: formEmail.trim(),
        allocatedBudgetToman: Number(formAllocated),
        absorbedBudgetToman: Number(formAbsorbed),
        performanceScore: Number(formScore),
        administrativeLevel: formLevel,
        province: formProvince,
        county: formCounty,
        description: formDesc.trim(),
        logoDataUrl: formLogoDataUrl || undefined,
      });
    } else {
      handleAddDepartment({
        name: formName.trim(),
        code: formCode.trim(),
        category: formCategory,
        categoryFa: categoryLabels[formCategory] || formCategoryFa,
        headPersonName: formHeadName.trim(),
        contactNumber: formPhone.trim(),
        email: formEmail.trim(),
        allocatedBudgetToman: Number(formAllocated),
        absorbedBudgetToman: Number(formAbsorbed),
        activeProjectsCount: 0,
        performanceScore: Number(formScore),
        administrativeLevel: formLevel,
        province: formProvince,
        county: formCounty,
        description: formDesc.trim(),
        logoDataUrl: formLogoDataUrl || undefined,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      const matchQuery =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.headPersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'ALL' || d.category === selectedCategory;
      const matchLvl = selectedLevel === 'ALL' || d.administrativeLevel === selectedLevel;
      // Narrowing the result set always drops the reader back to the first page
      // of the pager; `activePage` below clamps as a second safety net.
      return matchQuery && matchCat && matchLvl;
    });
  }, [departments, searchQuery, selectedCategory, selectedLevel]);

  // Aggregate stats
  const totalAllocated = useMemo(() => departments.reduce((s, d) => s + d.allocatedBudgetToman, 0), [departments]);
  const totalAbsorbed = useMemo(() => departments.reduce((s, d) => s + d.absorbedBudgetToman, 0), [departments]);
  const avgPerformance = useMemo(
    () => (departments.length > 0 ? Math.round(departments.reduce((s, d) => s + d.performanceScore, 0) / departments.length) : 0),
    [departments]
  );
  const avgAbsorption = totalAllocated > 0 ? Math.min(100, Math.round((totalAbsorbed / totalAllocated) * 100)) : 0;

  // Pagination — `activePage` clamps when a filter shrinks the result set.
  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const pagedDepartments = useMemo(() => {
    const start = (activePage - 1) * PAGE_SIZE;
    return filteredDepartments.slice(start, start + PAGE_SIZE);
  }, [filteredDepartments, activePage]);
  const pageNumbers = useMemo(() => {
    const start = Math.max(1, Math.min(activePage - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [activePage, totalPages]);

  const goToPage = (page: number) => setCurrentPage(Math.min(totalPages, Math.max(1, page)));

  // Category distribution drives which chips are worth rendering
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Department['category'], number>> = {};
    departments.forEach((d) => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return counts;
  }, [departments]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedLevel('ALL');
    setCurrentPage(1);
  };

  const kpiCards = [
    {
      id: 'absorption',
      label: 'میانگین جذب بودجه',
      value: `${toPersianDigits(avgAbsorption)}٪`,
      icon: Gauge,
      card: 'border-cyan-200 dark:border-cyan-900/70 bg-cyan-50/40 dark:bg-cyan-950/20',
      tile: 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
      valueClass: 'text-cyan-800 dark:text-cyan-300',
    },
    {
      id: 'absorbed',
      label: 'بودجه جذب‌شده کل',
      value: formatToman(totalAbsorbed),
      icon: Wallet,
      card: 'border-violet-200 dark:border-violet-900/70 bg-violet-50/40 dark:bg-violet-950/20',
      tile: 'bg-violet-100 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
      valueClass: 'text-violet-800 dark:text-violet-300',
    },
    {
      id: 'allocated',
      label: 'بودجه مصوب کل',
      value: formatToman(totalAllocated),
      icon: Banknote,
      card: 'border-blue-200 dark:border-blue-900/70 bg-blue-50/40 dark:bg-blue-950/20',
      tile: 'bg-blue-100 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      valueClass: 'text-blue-800 dark:text-blue-300',
    },
    {
      id: 'performance',
      label: 'میانگین امتیاز عملکرد',
      value: `${toPersianDigits(avgPerformance)} از ۱۰۰`,
      icon: Award,
      card: 'border-amber-200 dark:border-amber-900/70 bg-amber-50/40 dark:bg-amber-950/20',
      tile: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      valueClass: 'text-amber-800 dark:text-amber-300',
    },
  ];

  return (
    <div id="departments-view-root" className="space-y-5">
      {/* Macro KPI Cards — totals across every registered department */}
      <div id="departments-view-kpi-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div
              id={`departments-view-kpi-card-${kpi.id}`}
              key={kpi.id}
              className={`rounded-2xl border p-4 shadow-2xs flex items-center gap-3 ${kpi.card}`}
            >
              <div
                id={`departments-view-kpi-card-tile-${kpi.id}`}
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${kpi.tile}`}
              >
                <KpiIcon className="w-5 h-5" />
              </div>
              <div id={`departments-view-kpi-card-body-${kpi.id}`} className="min-w-0">
                <span className={`block text-base font-black leading-tight truncate ${kpi.valueClass}`}>{kpi.value}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar — search, result count, level filter, add action and category chips */}
      <div
        id="departments-view-toolbar"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 space-y-3"
      >
        <div id="departments-view-toolbar-top-row" className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div id="departments-view-toolbar-search-group" className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div id="departments-view-search-input" className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجوی نام اداره، مدیر یا کد..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-10 pl-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <span
              id="departments-view-result-count"
              className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 whitespace-nowrap"
            >
              <ListChecks className="w-3.5 h-3.5 text-blue-500" />
              {toPersianDigits(filteredDepartments.length)} اداره یافت شد
            </span>
          </div>

          <div id="departments-view-toolbar-actions" className="flex items-center gap-2 flex-wrap">
            <div id="departments-view-level-filter" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>سطح اداری:</span>
              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">همه سطوح اداری</option>
                <option value="NATIONAL">ملی / کشوری</option>
                <option value="PROVINCIAL">استانی</option>
                <option value="COUNTY">شهرستانی</option>
                <option value="RURAL_DISTRICT">بخشداری / دهیاری</option>
              </select>
            </div>

            {canEdit && (
              <button
                id="btn-add-department"
                onClick={handleOpenAdd}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-blue-600/25 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت نهاد / اداره جدید</span>
              </button>
            )}
          </div>
        </div>

        {/* Category chips */}
        <div
          id="departments-view-category-chips"
          className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-slate-100 dark:border-slate-800"
        >
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-1">حوزه فعالیت:</span>
          <button
            id="departments-view-category-chip-ALL"
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            همه ({toPersianDigits(departments.length)})
          </button>

          {CATEGORY_ORDER.filter((cat) => (categoryCounts[cat] || 0) > 0).map((cat) => {
            const style = DEPARTMENT_CATEGORY_STYLE[cat];
            const ChipIcon = style.icon;
            const isSelected = selectedCategory === cat;
            return (
              <button
                id={`departments-view-category-chip-${cat}`}
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? style.chip
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <ChipIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{categoryLabels[cat]}</span>
                <span className={`text-[10px] ${isSelected ? 'opacity-80' : 'text-slate-400'}`}>
                  ({toPersianDigits(categoryCounts[cat] || 0)})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Departments Grid */}
      {filteredDepartments.length > 0 ? (
        <div
          id="departments-view-departments-grid"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {pagedDepartments.map((dept) => {
            const catStyle = DEPARTMENT_CATEGORY_STYLE[dept.category];
            const DeptIcon = catStyle.icon;
            const deptProjects = projects.filter((p) => p.departmentId === dept.id);
            const absorptionRate =
              dept.allocatedBudgetToman > 0
                ? Math.min(100, Math.round((dept.absorbedBudgetToman / dept.allocatedBudgetToman) * 100))
                : 0;
            const budget = compactBudget(dept.allocatedBudgetToman);
            const barTone =
              absorptionRate >= 75
                ? 'bg-gradient-to-l from-emerald-500 to-emerald-400'
                : absorptionRate >= 40
                ? 'bg-gradient-to-l from-indigo-500 to-indigo-400'
                : 'bg-gradient-to-l from-amber-500 to-amber-400';

            return (
              <article
                id={`departments-view-card-${dept.id}`}
                key={dept.id}
                onClick={() => setDetailDept(dept)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailDept(dept);
                  }
                }}
                title="کلیک برای مشاهده جزئیات نهاد"
                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {/* Identity — centred emblem over the department name. An uploaded
                    logo replaces the category icon wherever the emblem is shown. */}
                <div
                  id={`departments-view-card-identity-${dept.id}`}
                  className="p-5 pb-4 flex flex-col items-center text-center"
                >
                  {dept.logoDataUrl ? (
                    <div
                      id={`departments-view-card-logo-${dept.id}`}
                      className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center p-1.5 overflow-hidden shrink-0 shadow-2xs"
                    >
                      <img src={dept.logoDataUrl} alt={`لوگوی ${dept.name}`} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div
                      id={`departments-view-card-icon-${dept.id}`}
                      className={`w-16 h-16 rounded-2xl border flex items-center justify-center shrink-0 ${catStyle.tile}`}
                    >
                      <DeptIcon className="w-7 h-7" />
                    </div>
                  )}

                  <div id={`departments-view-card-title-${dept.id}`} className="flex items-start justify-center gap-1 mt-3 w-full min-w-0">
                    <h3
                      className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight min-w-0 line-clamp-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors"
                      title={dept.name}
                    >
                      {dept.name}
                    </h3>
                    <HelpTooltip
                      portal
                      variant="ghost"
                      text={dept.description}
                      label="مشاهده توضیح نهاد"
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] font-mono text-slate-400 tracking-wider">{dept.code}</span>
                    <span
                      id={`departments-view-card-category-${dept.id}`}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${catStyle.soft}`}
                    >
                      {dept.categoryFa}
                    </span>
                  </div>

                  <p
                    id={`departments-view-card-mission-${dept.id}`}
                    className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 mt-2.5"
                  >
                    {dept.description}
                  </p>

                  <div
                    id={`departments-view-card-meta-${dept.id}`}
                    className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap"
                  >
                    <span className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{dept.headPersonName}</span>
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{dept.county ? `${dept.province} - ${dept.county}` : dept.province}</span>
                    </span>
                  </div>
                </div>

                {/* Three-metric strip: absorption gauge / active projects / approved budget */}
                <div
                  id={`departments-view-card-metrics-${dept.id}`}
                  className="grid grid-cols-3 items-stretch border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"
                >
                  <div
                    id={`departments-view-card-gauge-${dept.id}`}
                    className="flex items-center justify-center py-3"
                  >
                    <div className="relative w-14 h-14">
                      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r={GAUGE_RADIUS}
                          fill="none"
                          strokeWidth="6"
                          className="stroke-slate-200 dark:stroke-slate-700"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r={GAUGE_RADIUS}
                          fill="none"
                          strokeWidth="6"
                          strokeLinecap="round"
                          className={`transition-all duration-500 ${catStyle.ring}`}
                          strokeDasharray={2 * Math.PI * GAUGE_RADIUS}
                          strokeDashoffset={2 * Math.PI * GAUGE_RADIUS * (1 - absorptionRate / 100)}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800 dark:text-slate-100">
                        {toPersianDigits(absorptionRate)}٪
                      </span>
                    </div>
                  </div>

                  <div
                    id={`departments-view-card-projects-metric-${dept.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 border-x border-slate-100 dark:border-slate-800 text-center"
                  >
                    <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">
                      {toPersianDigits(deptProjects.length)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <FolderGit2 className="w-3 h-3 text-slate-400" />
                      پروژه جاری
                    </span>
                  </div>

                  <div
                    id={`departments-view-card-budget-metric-${dept.id}`}
                    className="flex flex-col items-center justify-center gap-0.5 px-1 py-3 text-center"
                  >
                    <span className="text-base font-black text-slate-900 dark:text-slate-100 leading-none">
                      {budget.value}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                      <Banknote className="w-3 h-3 text-slate-400" />
                      {budget.unit}
                    </span>
                  </div>
                </div>

                {/* Absorption progress */}
                <div id={`departments-view-card-progress-${dept.id}`} className="px-5 pt-4">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      id={`departments-view-card-progress-bar-${dept.id}`}
                      className={`h-full rounded-full transition-all duration-500 ${barTone}`}
                      style={{ width: `${absorptionRate}%` }}
                    />
                  </div>
                </div>

                <div
                  id={`departments-view-card-figures-${dept.id}`}
                  className="mt-auto px-5 py-3 flex items-center justify-between gap-2 text-[11px]"
                >
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 min-w-0">
                    <Coins className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{formatToman(dept.absorbedBudgetToman)} تخصیص‌یافته</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${catStyle.soft}`}
                    title="درصد جذب بودجه"
                  >
                    {toPersianDigits(absorptionRate)}٪ جذب
                  </span>
                </div>

                {/* Admin actions — the card itself opens the drill-down, so these
                    stop propagation to avoid opening the modal as a side effect. */}
                {canEdit && (
                  <div
                    id={`departments-view-card-actions-${dept.id}`}
                    className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 rounded-b-2xl flex items-center justify-end gap-1"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(dept);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="ویرایش نهاد"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(`آیا از حذف نهاد «${dept.name}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`, () =>
                          handleDeleteDepartment(dept.id)
                        );
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="حذف نهاد"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div
          id="departments-view-empty-state"
          className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800"
        >
          <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm">هیچ اداره یا نهادی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 mt-1">لطفاً عبارت جستجو یا فیلترهای خود را تغییر دهید.</p>
          <button
            id="btn-reset-department-filters"
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            پاک‌سازی جستجو و فیلترها
          </button>
        </div>
      )}

      {/* Pagination */}
      {filteredDepartments.length > 0 && totalPages > 1 && (
        <div id="departments-view-pagination" className="flex items-center justify-center gap-1.5 pt-1">
          <button
            id="departments-view-pagination-prev"
            type="button"
            onClick={() => goToPage(activePage - 1)}
            disabled={activePage === 1}
            aria-label="صفحه قبلی"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {pageNumbers.map((page) => (
            <button
              id={`departments-view-pagination-page-${page}`}
              key={page}
              type="button"
              onClick={() => goToPage(page)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-black transition-all ${
                page === activePage
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {toPersianDigits(page)}
            </button>
          ))}

          <button
            id="departments-view-pagination-next"
            type="button"
            onClick={() => goToPage(activePage + 1)}
            disabled={activePage === totalPages}
            aria-label="صفحه بعدی"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Department Drill-down Modal */}
      {detailDept &&
        (() => {
          const catStyle = DEPARTMENT_CATEGORY_STYLE[detailDept.category];
          const DeptIcon = catStyle.icon;
          const deptProjects = projects.filter((p) => p.departmentId === detailDept.id);
          const absorptionRate =
            detailDept.allocatedBudgetToman > 0
              ? Math.min(100, Math.round((detailDept.absorbedBudgetToman / detailDept.allocatedBudgetToman) * 100))
              : 0;
          const remainingToman = Math.max(0, detailDept.allocatedBudgetToman - detailDept.absorbedBudgetToman);
          const detailGaugeRadius = 32;

          return (
            <div
              id="departments-view-detail-modal"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <div
                id="departments-view-detail-modal-panel"
                ref={detailModalRef}
                className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              >
                {/* Header */}
                <div
                  id="departments-view-detail-modal-header"
                  className="flex items-start justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {detailDept.logoDataUrl ? (
                      <div
                        id="departments-view-detail-modal-logo"
                        className="w-12 h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center p-1 overflow-hidden shrink-0"
                      >
                        <img
                          src={detailDept.logoDataUrl}
                          alt={`لوگوی ${detailDept.name}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        id="departments-view-detail-modal-icon"
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${catStyle.tile}`}
                      >
                        <DeptIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider block">{detailDept.code}</span>
                      <h3 className="font-black text-base text-slate-900 dark:text-slate-100 leading-tight">
                        {detailDept.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.soft}`}>
                          {detailDept.categoryFa}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {ADMIN_LEVEL_LABELS[detailDept.administrativeLevel]}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {detailDept.county ? `${detailDept.province} - ${detailDept.county}` : detailDept.province}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    id="btn-close-department-details"
                    onClick={() => setDetailDept(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                    title="بستن"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div id="departments-view-detail-modal-body" className="p-5 space-y-4 text-xs">
                  {/* Contact & governance */}
                  <div id="departments-view-detail-modal-contact" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      id="departments-view-detail-modal-contact-manager"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <User className="w-3.5 h-3.5" />
                        مدیر مسئول
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{detailDept.headPersonName}</span>
                    </div>
                    <div
                      id="departments-view-detail-modal-contact-phone"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                        شماره تماس
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{detailDept.contactNumber}</span>
                    </div>
                    <div
                      id="departments-view-detail-modal-contact-email"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                        ایمیل سازمانی
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate" title={detailDept.email || 'ثبت نشده'}>
                        {detailDept.email || 'ثبت نشده'}
                      </span>
                    </div>
                    <div
                      id="departments-view-detail-modal-contact-projects"
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 shrink-0">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        پروژه‌های متولی
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {toPersianDigits(deptProjects.length)} پروژه
                      </span>
                    </div>
                  </div>

                  {/* Budget panel */}
                  <div
                    id="departments-view-detail-modal-budget"
                    className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                        وضعیت اعتبارات و جذب بودجه
                      </span>
                      <span className="text-[10px] text-slate-400">سال مالی جاری</span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 shrink-0">
                        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r={detailGaugeRadius}
                            fill="none"
                            strokeWidth="8"
                            className="stroke-slate-200 dark:stroke-slate-700"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r={detailGaugeRadius}
                            fill="none"
                            strokeWidth="8"
                            strokeLinecap="round"
                            className={`transition-all duration-500 ${catStyle.ring}`}
                            strokeDasharray={2 * Math.PI * detailGaugeRadius}
                            strokeDashoffset={2 * Math.PI * detailGaugeRadius * (1 - absorptionRate / 100)}
                          />
                        </svg>
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                            {toPersianDigits(absorptionRate)}٪
                          </span>
                          <span className="text-[9px] text-slate-400">جذب بودجه</span>
                        </span>
                      </div>

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">بودجه مصوب</span>
                          <span className="font-black text-slate-900 dark:text-slate-100">
                            {formatToman(detailDept.allocatedBudgetToman)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">جذب‌شده</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatToman(detailDept.absorbedBudgetToman)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span className="text-slate-500 dark:text-slate-400 text-[11px]">مانده قابل جذب</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">{formatToman(remainingToman)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mission */}
                  <div id="departments-view-detail-modal-mission">
                    <span className="font-bold text-slate-700 dark:text-slate-200 block mb-1.5">
                      شرح مأموریت و وظایف در توسعه منطقه
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                      {detailDept.description}
                    </p>
                  </div>

                  {/* Linked projects */}
                  <div id="departments-view-detail-modal-projects">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                        پروژه‌های تحت تولیت این نهاد
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {toPersianDigits(deptProjects.length)} پروژه ثبت‌شده
                      </span>
                    </div>

                    {deptProjects.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="text-[11px] text-slate-400">
                          پروژه‌ای با تولیت مستقیم این نهاد ثبت نشده است.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {deptProjects.map((proj) => (
                          <div
                            id={`departments-view-detail-modal-project-${proj.id}`}
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
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 w-9 text-left shrink-0">
                                {toPersianDigits(proj.progressPercentage)}٪
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">
                                {formatToman(proj.estimatedCostToman)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div
                  id="departments-view-detail-modal-footer"
                  className="sticky bottom-0 flex items-center justify-between gap-3 p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                >
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    شناسه سیستمی: {detailDept.code}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {canEdit && (
                      <button
                        id="btn-edit-department-from-details"
                        type="button"
                        onClick={() => {
                          const target = detailDept;
                          setDetailDept(null);
                          handleOpenEdit(target);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        ویرایش مشخصات
                      </button>
                    )}
                    <button
                      id="btn-close-department-details-footer"
                      type="button"
                      onClick={() => setDetailDept(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      بستن
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* CRUD Modal */}
      {isModalOpen && (
        <div id="departments-view-crud-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div id="departments-view-crud-modal-2" ref={modalRef} className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div id="departments-view-crud-modal-3" className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-500" />
                {editingDept ? 'ویرایش مشخصات نهاد متولی' : 'ثبت نهاد / اداره جدید در سامانه ملی'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div id="departments-view-crud-modal-4">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام کامل دستگاه اجرایی / اداره *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: شرکت مهندسی آب و فاضلاب شهرستان"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Organisation logo — stored inline, so no separate upload route */}
              <div id="departments-view-crud-modal-logo">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  لوگو / نشان سازمانی نهاد
                </label>
                <div className="flex items-center gap-3">
                  <div
                    id="departments-view-crud-modal-logo-preview"
                    className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0"
                  >
                    {formLogoDataUrl ? (
                      <img
                        src={formLogoDataUrl}
                        alt="پیش‌نمایش لوگوی نهاد"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        id="department-logo-upload-input"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFileChange(file);
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor="department-logo-upload-input"
                        className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold px-3 py-2 rounded-xl text-[11px] cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {formLogoDataUrl ? 'تغییر لوگو' : 'بارگذاری لوگو'}
                      </label>

                      {formLogoDataUrl && (
                        <button
                          id="btn-remove-department-logo"
                          type="button"
                          onClick={() => {
                            setFormLogoDataUrl('');
                            setFormLogoError(null);
                          }}
                          className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-700 font-bold px-2 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف لوگو
                        </button>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-400 leading-relaxed">
                      تصویر PNG، JPG، WebP یا SVG با حجم کمتر از ۵ مگابایت؛ لوگو به‌صورت خودکار فشرده و در کارت نهاد جایگزین آیکون
                      می‌شود.
                    </span>
                  </div>
                </div>
                {formLogoError && (
                  <p id="departments-view-crud-modal-logo-error" className="text-[10px] text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {formLogoError}
                  </p>
                )}
              </div>

              <div id="departments-view-crud-modal-5" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-6">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">کد شناسایی سیستمی</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="departments-view-crud-modal-7">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">سطح مدیریتی</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as AdministrativeLevel)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="NATIONAL">ملی / کشوری</option>
                    <option value="PROVINCIAL">استانی</option>
                    <option value="COUNTY">شهرستانی</option>
                    <option value="RURAL_DISTRICT">بخشداری / دهیاری</option>
                  </select>
                </div>
              </div>

              <div id="departments-view-crud-modal-8" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-9">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">حوزه تخصصی فعالیت</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const val = e.target.value as Department['category'];
                      setFormCategory(val);
                      setFormCategoryFa(categoryLabels[val]);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="INFRASTRUCTURE">زیرساخت و عمران</option>
                    <option value="HEALTH">بهداشت و درمان</option>
                    <option value="EDUCATION">آموزش و پرورش</option>
                    <option value="SOCIAL_WELFARE">حمایت اجتماعی</option>
                    <option value="AGRICULTURE">کشاورزی و منابع طبیعی</option>
                    <option value="ENVIRONMENT">محیط زیست</option>
                    <option value="MUNICIPAL_RURAL">امور دهیاری‌ها و شهری</option>
                  </select>
                </div>

                <div id="departments-view-crud-modal-10">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">نام مدیر مسئول</label>
                  <input
                    type="text"
                    value={formHeadName}
                    onChange={(e) => setFormHeadName(e.target.value)}
                    placeholder="نام و نام خانوادگی"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div id="departments-view-crud-modal-11" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-12">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شماره تماس مستقیم</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="۰۳۴-..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="departments-view-crud-modal-13">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">ایمیل سازمانی</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="info@org.ir"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="departments-view-crud-modal-14" className="grid grid-cols-2 gap-3">
                <div id="departments-view-crud-modal-15">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">بودجه مصوب (تومان)</label>
                  <input
                    type="number"
                    value={formAllocated}
                    onChange={(e) => setFormAllocated(Number(e.target.value))}
                    step="100000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div id="departments-view-crud-modal-16">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">بودجه جذب شده (تومان)</label>
                  <input
                    type="number"
                    value={formAbsorbed}
                    onChange={(e) => setFormAbsorbed(Number(e.target.value))}
                    step="100000000"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div id="departments-view-crud-modal-17">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">شرح مأموریت و وظایف در توسعه منطقه</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="اهداف اصلی، برنامه‌های عمرانی و محرومیت‌زدایی..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div id="departments-view-crud-modal-18" className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30"
                >
                  {editingDept ? 'ذخیره تغییرات' : 'ثبت نهایی نهاد'}
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
