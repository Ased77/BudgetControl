import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ExecutiveProject, ContributingDepartment, ProjectStatus, UrgencyLevel, AdministrativeLevel } from '../types';
import { formatToman, formatNumber } from '../utils/numberUtils';
import {
  FolderPlus,
  Building2,
  Wallet,
  Scale,
  Flame,
  Users2,
  HardHat,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  Layers,
  HelpCircle,
  Eye,
  Send,
  Sliders,
  DollarSign,
  PieChart,
  ShieldCheck,
  Check,
  ExternalLink,
  Droplets,
  Stethoscope,
  Compass,
  TrendingUp,
  Activity,
  BarChart3,
  Trees,
  Briefcase,
  GraduationCap,
  Home,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

export type ProjectCategoryKey =
  | 'WATER'
  | 'HEALTH'
  | 'ROAD'
  | 'RURAL_HOUSING'
  | 'EMPLOYMENT'
  | 'ENVIRONMENT'
  | 'EDUCATION';

export interface DemographicPrioritySuggestion {
  id: string;
  title: string;
  category: ProjectCategoryKey;
  categoryFa: string;
  demographicRationale: string;
  keyIndicatorBadge: string;
  urgency: UrgencyLevel;
  estimatedCostToman: number;
  beneficiariesCount: number;
  district: string;
  targetArea: string;
  suggestedDeptId: string;
  suggestedCrisisId: string;
  suggestedPriorityId: string;
  suggestedBudgetShares: {
    csr: number;
    gov: number;
    dehyari: number;
    bank: number;
    charity: number;
  };
  suggestedExecutorId: string;
  suggestedContractorId?: string;
  expectedOutcome: string;
}

const PROJECT_CATEGORIES: {
  key: ProjectCategoryKey;
  labelFa: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  activeBg: string;
  borderClass: string;
}[] = [
  { key: 'WATER', labelFa: 'آب و فاضلاب', icon: Droplets, color: 'text-blue-600', activeBg: 'bg-blue-600 text-white', borderClass: 'border-blue-200' },
  { key: 'HEALTH', labelFa: 'بهداشت و درمان', icon: Stethoscope, color: 'text-rose-600', activeBg: 'bg-rose-600 text-white', borderClass: 'border-rose-200' },
  { key: 'ROAD', labelFa: 'راه و حمل‌ونقل', icon: Compass, color: 'text-amber-600', activeBg: 'bg-amber-600 text-white', borderClass: 'border-amber-200' },
  { key: 'RURAL_HOUSING', labelFa: 'مسکن و عمران روستایی', icon: Home, color: 'text-emerald-600', activeBg: 'bg-emerald-600 text-white', borderClass: 'border-emerald-200' },
  { key: 'EMPLOYMENT', labelFa: 'اشتغال و کارآفرینی', icon: Briefcase, color: 'text-purple-600', activeBg: 'bg-purple-600 text-white', borderClass: 'border-purple-200' },
  { key: 'ENVIRONMENT', labelFa: 'محیط‌زیست و ریزگرد', icon: Trees, color: 'text-teal-600', activeBg: 'bg-teal-600 text-white', borderClass: 'border-teal-200' },
  { key: 'EDUCATION', labelFa: 'آموزش و مدارس', icon: GraduationCap, color: 'text-indigo-600', activeBg: 'bg-indigo-600 text-white', borderClass: 'border-indigo-200' },
];

const BENEFICIARY_OPTIONS = [
  'مددجویان کمیته امداد امام (ره)',
  'توانخواهان و خانواده‌های تحت پوشش بهزیستی',
  'ساکنان سکونتگاه‌های غیررسمی و حاشیه‌نشین',
  'روستاییان مناطق محروم و دارای تنش آبی',
  'جوانان جویای کار و فارغ‌التحصیلان',
  'زوج‌های جوان و نیازمندان تسهیلات ازدواج/مسکن',
  'بیماران خاص و نیازمندان خدمات درمانی تخصصی',
  'عموم شهروندان و رانندگان محورهای مواصلاتی',
];

export const CreateProjectView: React.FC = () => {
  const {
    projects,
    departments,
    budgetSources,
    priorities,
    crisesHarms,
    executors,
    contractors,
    locations,
    selectedLocation,
    handleAddProject,
    setActiveTab,
    currentUser,
  } = useAppContext();

  // --- Step 1: Basic Information ---
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(`PRJ-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(100 + Math.random() * 900)}`);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PROPOSED');
  const [startYear, setStartYear] = useState<number>(1403);
  const [endYear, setEndYear] = useState<number>(1404);
  const [durationMonths, setDurationMonths] = useState<number>(12);

  // --- Step 2: Department Governance & Multi-Department ---
  const [requestingDeptId, setRequestingDeptId] = useState<string>(departments[0]?.id || '');
  const [primaryDeptId, setPrimaryDeptId] = useState<string>(departments[0]?.id || '');
  const [isMultiDept, setIsMultiDept] = useState<boolean>(false);
  const [contributingDepts, setContributingDepts] = useState<ContributingDepartment[]>([]);

  // Temp fields for adding a contributing department
  const [newContribDeptId, setNewContribDeptId] = useState<string>(departments[1]?.id || departments[0]?.id || '');
  const [newContribPct, setNewContribPct] = useState<number>(20);
  const [newContribRole, setNewContribRole] = useState<string>('تأمین زیرساخت فنی و نظارت میدانی');

  // --- Step 3: Crisis & Harm Alignment ---
  const [selectedCrisisId, setSelectedCrisisId] = useState<string>(crisesHarms[0]?.id || '');
  const [urgency, setUrgency] = useState<UrgencyLevel>('HIGH');

  // --- Step 4: Strategic Priority Alignment ---
  const [selectedPriorityId, setSelectedPriorityId] = useState<string>(priorities[0]?.id || '');

  // --- Step 5: Location & Target Beneficiaries ---
  const [adminLevel, setAdminLevel] = useState<AdministrativeLevel>('COUNTY');
  const [province, setProvince] = useState<string>('کرمان');
  const [county, setCounty] = useState<string>('شهرستان رفسنجان');
  const [district, setDistrict] = useState<string>('بخش مرکزی و شهر رفسنجان');
  const [targetArea, setTargetArea] = useState<string>('حوزه شهری رفسنجان و حاشیه');
  const [beneficiariesCount, setBeneficiariesCount] = useState<number>(5000);
  const [selectedBeneficiaryGroups, setSelectedBeneficiaryGroups] = useState<string[]>([
    'روستاییان مناطق محروم و دارای تنش آبی',
  ]);

  // --- Step 6: Multi-Source Budgeting ---
  const [primaryBudgetSourceId, setPrimaryBudgetSourceId] = useState<string>(budgetSources[0]?.id || '');
  const [estimatedCostToman, setEstimatedCostToman] = useState<number>(500_000_000_000); // 500 Billion Tomans
  const [currentYearAllocatedToman, setCurrentYearAllocatedToman] = useState<number>(300_000_000_000);
  const [futureYearsAllocatedToman, setFutureYearsAllocatedToman] = useState<number>(200_000_000_000);

  // Shares (in percentage, must sum up to 100%)
  const [csrSharePct, setCsrSharePct] = useState<number>(70);
  const [govSharePct, setGovSharePct] = useState<number>(20);
  const [dehyariSharePct, setDehyariSharePct] = useState<number>(10);
  const [bankSharePct, setBankSharePct] = useState<number>(0);
  const [charitySharePct, setCharitySharePct] = useState<number>(0);

  // --- Step 7: Implementation (Executor & Contractor) ---
  const [executorId, setExecutorId] = useState<string>(executors[0]?.id || '');
  const [contractorId, setContractorId] = useState<string>(contractors[0]?.id || '');

  // Demographic-Driven Priority Planning States
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategoryKey>('WATER');
  const [appliedPriorityNotice, setAppliedPriorityNotice] = useState<string | null>(null);
  const [plannerExpanded, setPlannerExpanded] = useState<boolean>(true);

  // Feedback states
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);

  // --- Computed Entities ---
  const requestingDept = departments.find((d) => d.id === requestingDeptId);
  const primaryDept = departments.find((d) => d.id === primaryDeptId);
  const selectedCrisis = crisesHarms.find((c) => c.id === selectedCrisisId);
  const selectedPriority = priorities.find((p) => p.id === selectedPriorityId);
  const primaryBudgetSource = budgetSources.find((b) => b.id === primaryBudgetSourceId);
  const selectedExecutor = executors.find((e) => e.id === executorId);
  const selectedContractor = contractors.find((c) => c.id === contractorId);

  // Total budget share sum
  const totalBudgetShares = csrSharePct + govSharePct + dehyariSharePct + bankSharePct + charitySharePct;
  const isBudgetShareValid = totalBudgetShares === 100;

  // Cost Per Beneficiary
  const costPerBeneficiary = useMemo(() => {
    const validCount = Math.max(1, beneficiariesCount);
    return Math.round(estimatedCostToman / validCount);
  }, [estimatedCostToman, beneficiariesCount]);

  // Anti-Overlap Pre-check: Check if any existing project matches the same target area or same crisis
  const potentialDuplicates = useMemo(() => {
    if (!title.trim() && !targetArea.trim()) return [];
    return projects.filter((p) => {
      const matchCrisis = p.crisisHarmId === selectedCrisisId;
      const matchDistrict = p.district && district && (p.district.includes(district) || district.includes(p.district));
      const matchTitle = title.trim().length > 3 && (p.title.includes(title.trim()) || title.trim().includes(p.title));
      return (matchCrisis && matchDistrict) || matchTitle;
    });
  }, [selectedCrisisId, district, title, targetArea, projects]);

  // Handle adding contributing department
  const handleAddContributingDept = () => {
    if (!newContribDeptId) return;
    const targetDept = departments.find((d) => d.id === newContribDeptId);
    if (!targetDept) return;
    if (contributingDepts.some((c) => c.departmentId === newContribDeptId)) return;

    const shareAmount = Math.round((estimatedCostToman * newContribPct) / 100);
    const newContrib: ContributingDepartment = {
      departmentId: targetDept.id,
      departmentName: targetDept.name,
      sharePercentage: newContribPct,
      shareAmountToman: shareAmount,
      roleDescription: newContribRole,
    };
    setContributingDepts((prev) => [...prev, newContrib]);
    setNewContribRole('');
  };

  const handleRemoveContributingDept = (id: string) => {
    setContributingDepts((prev) => prev.filter((c) => c.departmentId !== id));
  };

  // Toggle beneficiary group
  const handleToggleBeneficiaryGroup = (group: string) => {
    setSelectedBeneficiaryGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  // --- Intelligent Recommendation Engine based on Title & Location Context ---
  const smartInference = useMemo(() => {
    const combinedText = `${title} ${targetArea}`.trim();
    const t = combinedText.toLowerCase();

    // 1. Domain Detection
    const isWater = /آب|آبرسانی|مخزن|چاه|لوله|تنش آب|شرب|تصفیه|پمپاژ|سفره|آبخوان/.test(t);
    const isRoad = /راه|جاده|محور|آسفالت|تعریض|روشنایی|پرحادثه|ترابری|تصادف|شاخ‌به‌شاخ|حمل‌ونقل/.test(t);
    const isHealth = /درمان|پزشک|بیمار|بهداشت|دیالیز|مسموم|متانول|اورژانس|بیمارستان|ناباروری|سلامت روان|سم‌زدایی|پادزهر/.test(t);
    const isSocialWelfare = /بهزیستی|مددجو|معتاد|کمپ|ماده ۱۶|توانبخشی|اورژانس اجتماعی|کودکان کار|معلول|زنان سرپرست|آسیب اجتماعی/.test(t);
    const isEmployment = /اشتغال|کارآفرین|وام|تسهیلات|تبصره|مهارت|کسب‌وکار|شغل|فنی‌وحرفه‌ای|کارگاه/.test(t);
    const isEnvironment = /محیط زیست|بادشکن|ریزگرد|گردوغبار|ماسه|فرسایش|هوای پاک|درخت|پایش هوا|آلایند/.test(t);
    const isEducation = /مدرسه|آموزش|دانش‌آموز|بورسیه|هنرستان|کلاس|کانکس|تحصیل/.test(t);
    const isUrban = /شهرداری|بوستان|پارک|شهر|زباله|خدمات شهری|معابر شهری|بازآفرینی/.test(t);
    const isRuralHousing = /مسکن|طرح هادی|بنیاد مسکن|روستایی|مقاوم‌سازی|عمران روستا/.test(t);

    // 2. Geographic Detection from Title if present
    let inferredDistrict = district;
    if (/کشکوئیه|راویز/.test(t)) {
      inferredDistrict = 'بخش کشکوئیه و دهستان راویز';
    } else if (/نوق|بهرمان|دقوق‌آباد|باقریه/.test(t)) {
      inferredDistrict = 'بخش نوق و شهر بهرمان';
    } else if (/فردوس|صفائیه|چاه‌میل/.test(t)) {
      inferredDistrict = 'بخش فردوس و شهر صفائیه';
    } else if (/مرکزی|شهر رفسنجان|داوران|رحمت‌آباد|علی‌آباد|کمال‌آباد/.test(t)) {
      inferredDistrict = 'بخش مرکزی و شهر رفسنجان';
    }

    // 3. Demographic Baselines from Official Census & Data in Rafsanjan
    let districtTotalPop = 222000;
    let districtVulnerablePop = 18500;
    let districtNameFa = 'بخش مرکزی و شهر رفسنجان';

    const activeDistrict = inferredDistrict || district;
    if (activeDistrict.includes('کشکوئیه')) {
      districtTotalPop = 41000;
      districtVulnerablePop = 8400;
      districtNameFa = 'بخش کشکوئیه و دهستان راویز';
    } else if (activeDistrict.includes('نوق')) {
      districtTotalPop = 29000;
      districtVulnerablePop = 6200;
      districtNameFa = 'بخش نوق و شهر بهرمان';
    } else if (activeDistrict.includes('فردوس')) {
      districtTotalPop = 23000;
      districtVulnerablePop = 5100;
      districtNameFa = 'بخش فردوس و شهر صفائیه';
    } else if (activeDistrict.includes('کل شهرستان')) {
      districtTotalPop = 315000;
      districtVulnerablePop = 38200;
      districtNameFa = 'کل شهرستان رفسنجان';
    }

    // 4. Beneficiaries Count Inference (The User's Primary Focus Element)
    let suggestedBeneficiaries = 5000;
    let suggestedBeneficiariesReason = '';

    if (isWater) {
      if (/راویز|روستا|تک روستا|اقماری/.test(t)) {
        suggestedBeneficiaries = 4200;
        suggestedBeneficiariesReason = `روستاییان تحت پوشش شبکه آب در ${districtNameFa}`;
      } else if (activeDistrict.includes('کشکوئیه')) {
        suggestedBeneficiaries = 22000;
        suggestedBeneficiariesReason = 'ساکنان تحت پوشش آب شرب پایدار بخش کشکوئیه';
      } else if (activeDistrict.includes('نوق')) {
        suggestedBeneficiaries = 18000;
        suggestedBeneficiariesReason = 'ساکنان تحت پوشش آب شرب دشت نوق و بهرمان';
      } else if (activeDistrict.includes('فردوس')) {
        suggestedBeneficiaries = 14000;
        suggestedBeneficiariesReason = 'ساکنان روستاهای دارای تنش آبی بخش فردوس';
      } else {
        suggestedBeneficiaries = 35000;
        suggestedBeneficiariesReason = 'جمعیت بهره‌بردار از ارتقای شبکه آب و مخازن ذخیره';
      }
    } else if (isRoad) {
      if (activeDistrict.includes('نوق')) {
        suggestedBeneficiaries = 29000;
        suggestedBeneficiariesReason = 'ترددکنندگان روزانه محور پرحادثه رفسنجان - نوق';
      } else if (activeDistrict.includes('کشکوئیه')) {
        suggestedBeneficiaries = 32000;
        suggestedBeneficiariesReason = 'ترددکنندگان محورهای مواصلاتی و روستاهای کشکوئیه';
      } else {
        suggestedBeneficiaries = 45000;
        suggestedBeneficiariesReason = 'شهروندان و کاربران محورهای شریانی شهرستان';
      }
    } else if (isHealth) {
      if (/دیالیز|مسموم|متانول|اورژانس/.test(t)) {
        suggestedBeneficiaries = 14500;
        suggestedBeneficiariesReason = 'بیماران حاد، مراجعان اورژانس و خانواده‌های نیازمند خدمات تخصصی';
      } else if (/ناباروری/.test(t)) {
        suggestedBeneficiaries = 3200;
        suggestedBeneficiariesReason = 'زوج‌های نابارور کم‌بضاعت تحت درمان تخصصی در شهرستان';
      } else {
        suggestedBeneficiaries = 25000;
        suggestedBeneficiariesReason = 'مراجعان سالانه مراکز جامع سلامت و پایگاه‌های بهداشتی';
      }
    } else if (isEmployment) {
      suggestedBeneficiaries = 2500;
      suggestedBeneficiariesReason = 'جوانان جویای کار، فارغ‌التحصیلان و بهبودیافتگان دریافت‌کننده وام';
    } else if (isSocialWelfare) {
      suggestedBeneficiaries = districtVulnerablePop > 0 ? Math.min(districtVulnerablePop, 6500) : 5000;
      suggestedBeneficiariesReason = `مددجویان بهزیستی، نیازمندان و خانواده‌های آسیب‌دیده ${districtNameFa}`;
    } else if (isEnvironment) {
      suggestedBeneficiaries = 28000;
      suggestedBeneficiariesReason = 'ساکنان محدوده تحت تأثیر ریزگردها و فرسایش بادی دشت رفسنجان';
    } else if (isEducation) {
      suggestedBeneficiaries = 3800;
      suggestedBeneficiariesReason = 'دانش‌آموزان مدارس مناطق کم‌برخوردار و هنرستان‌های فنی';
    } else if (isUrban) {
      suggestedBeneficiaries = 65000;
      suggestedBeneficiariesReason = 'شهروندان بهره‌مند از خدمات شهری و ارتقای بهسازی معابر';
    } else if (isRuralHousing) {
      suggestedBeneficiaries = 4800;
      suggestedBeneficiariesReason = 'خانوارهای روستایی بهره‌مند از بهسازی مسکن و طرح هادی';
    } else {
      suggestedBeneficiaries = Math.round(districtTotalPop * 0.25);
      suggestedBeneficiariesReason = `برآورد ۲۵٪ جمعیت تحت پوشش در ${districtNameFa}`;
    }

    // 5. Suggested Department
    let suggestedDeptId = departments[0]?.id || '';
    if (isWater) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-01' || d.category === 'INFRASTRUCTURE' || d.name.includes('آب'))?.id || suggestedDeptId;
    } else if (isHealth) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-02' || d.category === 'HEALTH' || d.name.includes('پزشکی'))?.id || suggestedDeptId;
    } else if (isRoad) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-03' || d.name.includes('راهداری'))?.id || suggestedDeptId;
    } else if (isSocialWelfare || isEmployment) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-04' || d.name.includes('بهزیستی'))?.id || suggestedDeptId;
    } else if (isRuralHousing) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-05' || d.name.includes('بنیاد مسکن'))?.id || suggestedDeptId;
    } else if (isEnvironment) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-06' || d.name.includes('محیط‌زیست'))?.id || suggestedDeptId;
    } else if (isUrban) {
      suggestedDeptId = departments.find((d) => d.id === 'dept-07' || d.name.includes('شهرداری'))?.id || suggestedDeptId;
    }

    // 6. Suggested Crisis
    let suggestedCrisisId = crisesHarms[0]?.id || '';
    if (isWater) {
      suggestedCrisisId = crisesHarms.find((c) => c.id === 'crisis-01' || c.title.includes('آب'))?.id || suggestedCrisisId;
    } else if (isRoad) {
      suggestedCrisisId = crisesHarms.find((c) => c.id === 'crisis-02' || c.title.includes('تصادف') || c.title.includes('جاده'))?.id || suggestedCrisisId;
    } else if (isHealth) {
      suggestedCrisisId = crisesHarms.find((c) => c.id === 'crisis-03' || c.title.includes('مسمومیت') || c.title.includes('سلامت'))?.id || suggestedCrisisId;
    } else if (isEmployment || isSocialWelfare) {
      suggestedCrisisId = crisesHarms.find((c) => c.id === 'crisis-04' || c.title.includes('بیکاری'))?.id || suggestedCrisisId;
    } else if (isEnvironment) {
      suggestedCrisisId = crisesHarms.find((c) => c.id === 'crisis-05' || c.title.includes('فرسایش') || c.title.includes('باد'))?.id || suggestedCrisisId;
    }

    // 7. Suggested Priority
    let suggestedPriorityId = priorities[0]?.id || '';
    if (isWater || isRoad || isRuralHousing) {
      suggestedPriorityId = 'p1';
    } else if (isEmployment) {
      suggestedPriorityId = 'p2';
    } else if (isSocialWelfare) {
      suggestedPriorityId = 'p3';
    } else if (isHealth) {
      suggestedPriorityId = 'p4';
    } else if (isEnvironment) {
      suggestedPriorityId = 'p5';
    } else if (isEducation) {
      suggestedPriorityId = 'p7';
    }

    // 8. Suggested Budget Shares
    let suggestedBudget = { csr: 70, gov: 20, dehyari: 10, bank: 0, charity: 0, label: 'الگوی مشترک: CSR مس (۷۰٪) + دولت (۲۰٪) + دهیاری (۱۰٪)' };
    let suggestedCostToman = 800_000_000_000;
    if (isWater) {
      suggestedBudget = { csr: 85, gov: 15, dehyari: 0, bank: 0, charity: 0, label: 'الگوی آبفا: CSR مس (۸۵٪) + اعتبارات دولتی (۱۵٪)' };
      suggestedCostToman = 1_200_000_000_000;
    } else if (isRoad) {
      suggestedBudget = { csr: 80, gov: 20, dehyari: 0, bank: 0, charity: 0, label: 'الگوی راهداری: CSR مس (۸۰٪) + بودجه ملی/استانی (۲۰٪)' };
      suggestedCostToman = 1_100_000_000_000;
    } else if (isHealth) {
      suggestedBudget = { csr: 90, gov: 10, dehyari: 0, bank: 0, charity: 0, label: 'الگوی سلامت و درمان: CSR مس (۹۰٪) + وزارت بهداشت (۱۰٪)' };
      suggestedCostToman = 850_000_000_000;
    } else if (isEmployment) {
      suggestedBudget = { csr: 30, gov: 0, dehyari: 0, bank: 70, charity: 0, label: 'الگوی اشتغال: تسهیلات بانکی تبصره ۲ (۷۰٪) + یارانه CSR مس (۳۰٪)' };
      suggestedCostToman = 450_000_000_000;
    } else if (isEnvironment) {
      suggestedBudget = { csr: 100, gov: 0, dehyari: 0, bank: 0, charity: 0, label: 'الگوی محیط‌زیست: ۱۰۰٪ اعتبارات مسئولیت اجتماعی CSR مس' };
      suggestedCostToman = 1_440_000_000_000;
    }

    // 9. Suggested Beneficiary Groups
    let suggestedGroups: string[] = [];
    if (isWater) suggestedGroups = ['روستاییان مناطق محروم و دارای تنش آبی'];
    else if (isRoad) suggestedGroups = ['عموم شهروندان و رانندگان محورهای مواصلاتی'];
    else if (isHealth) suggestedGroups = ['بیماران خاص و نیازمندان خدمات درمانی تخصصی', 'عموم شهروندان و رانندگان محورهای مواصلاتی'];
    else if (isEmployment) suggestedGroups = ['جوانان جویای کار و فارغ‌التحصیلان'];
    else if (isSocialWelfare) suggestedGroups = ['توانخواهان و خانواده‌های تحت پوشش بهزیستی', 'مددجویان کمیته امداد امام (ره)'];
    else if (isEnvironment) suggestedGroups = ['ساکنان سکونتگاه‌های غیررسمی و حاشیه‌نشین', 'عموم شهروندان و رانندگان محورهای مواصلاتی'];

    // 10. Suggested Executor & Contractor
    let suggestedExecId = executors[0]?.id || '';
    let suggestedContractorId = contractors[0]?.id || '';
    if (isWater) {
      suggestedExecId = executors.find((e) => e.id === 'exec-01' || e.name.includes('سپاه'))?.id || suggestedExecId;
      suggestedContractorId = contractors.find((c) => c.id === 'cnt-01' || c.companyName.includes('بتن'))?.id || suggestedContractorId;
    } else if (isRoad) {
      suggestedExecId = executors.find((e) => e.id === 'exec-01' || e.id === 'exec-03')?.id || suggestedExecId;
      suggestedContractorId = contractors.find((c) => c.id === 'cnt-02' || c.companyName.includes('راه‌سازی'))?.id || suggestedContractorId;
    } else if (isHealth) {
      suggestedExecId = executors.find((e) => e.id === 'exec-04' || e.name.includes('پزشکی'))?.id || suggestedExecId;
      suggestedContractorId = contractors.find((c) => c.id === 'cnt-03' || c.companyName.includes('پزشکی'))?.id || suggestedContractorId;
    } else if (isEnvironment) {
      suggestedExecId = executors.find((e) => e.id === 'exec-01')?.id || suggestedExecId;
      suggestedContractorId = contractors.find((c) => c.id === 'cnt-04' || c.companyName.includes('سبز'))?.id || suggestedContractorId;
    } else if (isSocialWelfare || isRuralHousing) {
      suggestedExecId = executors.find((e) => e.id === 'exec-05')?.id || suggestedExecId;
    }

    const hasSignal = title.trim().length > 2 || targetArea.trim().length > 2;

    return {
      hasSignal,
      domainLabel: isWater
        ? 'آبرسانی و آب شرب'
        : isRoad
        ? 'راه و ایمنی حمل‌ونقل'
        : isHealth
        ? 'بهداشت و فوریت‌های درمان'
        : isEmployment
        ? 'اشتغال و مهارت‌آموزی'
        : isEnvironment
        ? 'محیط‌زیست و ریزگرد'
        : isSocialWelfare
        ? 'حمایت اجتماعی و بهزیستی'
        : 'عمران و زیرساخت عمومی',
      inferredDistrict,
      districtTotalPop,
      districtVulnerablePop,
      districtNameFa,
      suggestedBeneficiaries,
      suggestedBeneficiariesReason,
      suggestedDeptId,
      suggestedDept: departments.find((d) => d.id === suggestedDeptId),
      suggestedCrisisId,
      suggestedCrisis: crisesHarms.find((c) => c.id === suggestedCrisisId),
      suggestedPriorityId,
      suggestedPriority: priorities.find((p) => p.id === suggestedPriorityId),
      suggestedBudget,
      suggestedCostToman,
      suggestedGroups,
      suggestedExecId,
      suggestedExecutor: executors.find((e) => e.id === suggestedExecId),
      suggestedContractorId,
      suggestedContractor: contractors.find((c) => c.id === suggestedContractorId),
    };
  }, [title, targetArea, district, departments, crisesHarms, priorities, executors, contractors]);

  // Apply all smart recommendations with 1 click
  const handleApplyAllSmartSuggestions = () => {
    if (smartInference.suggestedBeneficiaries) {
      setBeneficiariesCount(smartInference.suggestedBeneficiaries);
    }
    if (smartInference.inferredDistrict && smartInference.inferredDistrict !== district) {
      setDistrict(smartInference.inferredDistrict);
    }
    if (smartInference.suggestedDeptId) {
      setPrimaryDeptId(smartInference.suggestedDeptId);
      setRequestingDeptId(smartInference.suggestedDeptId);
    }
    if (smartInference.suggestedCrisisId) {
      setSelectedCrisisId(smartInference.suggestedCrisisId);
    }
    if (smartInference.suggestedPriorityId) {
      setSelectedPriorityId(smartInference.suggestedPriorityId);
    }
    if (smartInference.suggestedBudget) {
      setCsrSharePct(smartInference.suggestedBudget.csr);
      setGovSharePct(smartInference.suggestedBudget.gov);
      setDehyariSharePct(smartInference.suggestedBudget.dehyari);
      setBankSharePct(smartInference.suggestedBudget.bank);
      setCharitySharePct(smartInference.suggestedBudget.charity);
    }
    if (smartInference.suggestedCostToman) {
      setEstimatedCostToman(smartInference.suggestedCostToman);
      setCurrentYearAllocatedToman(Math.round(smartInference.suggestedCostToman * 0.6));
      setFutureYearsAllocatedToman(Math.round(smartInference.suggestedCostToman * 0.4));
    }
    if (smartInference.suggestedGroups && smartInference.suggestedGroups.length > 0) {
      setSelectedBeneficiaryGroups(smartInference.suggestedGroups);
    }
    if (smartInference.suggestedExecId) {
      setExecutorId(smartInference.suggestedExecId);
    }
    if (smartInference.suggestedContractorId) {
      setContractorId(smartInference.suggestedContractorId);
    }
  };

  // Auto-adapt category if title or target area strongly matches another domain
  useEffect(() => {
    const t = `${title} ${targetArea}`.toLowerCase();
    if (/درمان|پزشک|بیمار|بهداشت|دیالیز|مسموم|متانول|اورژانس|بیمارستان|ناباروری|سلامت روان/.test(t)) {
      setSelectedCategory('HEALTH');
    } else if (/آب|آبرسانی|مخزن|چاه|لوله|تنش آب|شرب|تصفیه|پمپاژ|سفره|آبخوان/.test(t)) {
      setSelectedCategory('WATER');
    } else if (/راه|جاده|محور|آسفالت|تعریض|روشنایی|پرحادثه|ترابری|تصادف|شاخ‌به‌شاخ|حمل‌ونقل/.test(t)) {
      setSelectedCategory('ROAD');
    } else if (/محیط زیست|بادشکن|ریزگرد|گردوغبار|ماسه|فرسایش|هوای پاک|درخت|پایش هوا/.test(t)) {
      setSelectedCategory('ENVIRONMENT');
    } else if (/اشتغال|کارآفرین|وام|تسهیلات|تبصره|مهارت|کسب‌وکار|شغل|فنی‌وحرفه‌ای/.test(t)) {
      setSelectedCategory('EMPLOYMENT');
    } else if (/مسکن|طرح هادی|بنیاد مسکن|روستایی|مقاوم‌سازی|عمران روستا/.test(t)) {
      setSelectedCategory('RURAL_HOUSING');
    } else if (/مدرسه|آموزش|دانش‌آموز|بورسیه|هنرستان|کلاس|کانکس/.test(t)) {
      setSelectedCategory('EDUCATION');
    }
  }, [title, targetArea]);

  // Active demographic data of the chosen district
  const activeLocationData = useMemo(() => {
    if (district.includes('کشکوئیه')) {
      return locations.find((l) => l.id.includes('koshkuiyeh')) || locations[2];
    }
    if (district.includes('نوق')) {
      return locations.find((l) => l.id.includes('nuq')) || locations[3];
    }
    if (district.includes('فردوس')) {
      return locations.find((l) => l.id.includes('ferdows')) || locations[4];
    }
    if (district.includes('کل شهرستان')) {
      return locations.find((l) => l.id.includes('all')) || locations[0];
    }
    return locations.find((l) => l.id.includes('central')) || locations[1];
  }, [district, locations]);

  // Demographic-driven smart priorities generator
  const demographicPrioritySuggestions = useMemo((): DemographicPrioritySuggestion[] => {
    const locName = district || 'بخش مرکزی و شهر رفسنجان';
    const isKoshkuiyeh = locName.includes('کشکوئیه') || locName.includes('راویز');
    const isNuq = locName.includes('نوق') || locName.includes('بهرمان');
    const isFerdows = locName.includes('فردوس') || locName.includes('صفائیه');
    const isCounty = locName.includes('کل شهرستان');

    const waterDeptId = departments.find((d) => d.name.includes('آب'))?.id || departments[0]?.id || 'dept-01';
    const healthDeptId = departments.find((d) => d.name.includes('پزشکی') || d.name.includes('بهداشت'))?.id || departments[1]?.id || 'dept-02';
    const roadDeptId = departments.find((d) => d.name.includes('راهداری') || d.name.includes('حمل'))?.id || departments[2]?.id || 'dept-03';
    const welfareDeptId = departments.find((d) => d.name.includes('بهزیستی') || d.name.includes('امداد'))?.id || departments[3]?.id || 'dept-04';
    const housingDeptId = departments.find((d) => d.name.includes('مسکن') || d.name.includes('بنیاد'))?.id || departments[4]?.id || 'dept-05';
    const envDeptId = departments.find((d) => d.name.includes('محیط'))?.id || departments[5]?.id || 'dept-06';
    const eduDeptId = departments.find((d) => d.name.includes('آموزش') || d.name.includes('شهرداری'))?.id || departments[6]?.id || 'dept-07';

    const waterCrisisId = crisesHarms.find((c) => c.title.includes('آب'))?.id || crisesHarms[0]?.id || 'crisis-01';
    const roadCrisisId = crisesHarms.find((c) => c.title.includes('جاده') || c.title.includes('سوانح'))?.id || crisesHarms[1]?.id || 'crisis-02';
    const healthCrisisId = crisesHarms.find((c) => c.title.includes('سلامت') || c.title.includes('الکل') || c.title.includes('درمان'))?.id || crisesHarms[2]?.id || 'crisis-03';
    const socialCrisisId = crisesHarms.find((c) => c.title.includes('بیکاری') || c.title.includes('اعتیاد'))?.id || crisesHarms[3]?.id || 'crisis-04';
    const envCrisisId = crisesHarms.find((c) => c.title.includes('ریزگرد') || c.title.includes('فرسایش'))?.id || crisesHarms[4]?.id || 'crisis-05';

    const pInfra = priorities.find((p) => p.category.includes('عمران'))?.id || 'p1';
    const pEcon = priorities.find((p) => p.category.includes('اقتصاد'))?.id || 'p2';
    const pHealth = priorities.find((p) => p.category.includes('بهداشت'))?.id || 'p4';
    const pEnv = priorities.find((p) => p.category.includes('محیط'))?.id || 'p5';
    const pRural = priorities.find((p) => p.category.includes('روستایی'))?.id || 'p6';
    const pEdu = priorities.find((p) => p.category.includes('آموزش'))?.id || 'p7';

    const execWater = executors.find((e) => e.name.includes('آب'))?.id || executors[0]?.id;
    const execHealth = executors.find((e) => e.name.includes('پزشکی'))?.id || executors[0]?.id;
    const execCivil = executors[0]?.id;
    const execEcon = executors.find((e) => e.name.includes('کارآفرینی') || e.name.includes('صندوق'))?.id || executors[0]?.id;

    const cntCivil = contractors[0]?.id;
    const cntRoad = contractors.find((c) => c.companyName.includes('راه'))?.id || contractors[0]?.id;
    const cntMedical = contractors.find((c) => c.companyName.includes('پزشکی'))?.id || contractors[0]?.id;
    const cntEnv = contractors.find((c) => c.companyName.includes('سبز') || c.companyName.includes('زیست'))?.id || contractors[0]?.id;

    // --- CASE: KOSHKUIYEH & RAVIZ ---
    if (isKoshkuiyeh) {
      if (selectedCategory === 'HEALTH') {
        return [
          {
            id: 'kosh-health-1',
            title: 'احداث و تجهیز خانه بهداشت روستایی در دهستان راویز',
            category: 'HEALTH',
            categoryFa: 'بهداشت و درمان',
            demographicRationale: 'شاخص کمبود دسترسی سلامت ۴۵٪، وجود ۸,۴۰۰ نفر اقشار آسیب‌پذیر و فاصله بیش از ۵۰ کیلومتری از نزدیک‌ترین بیمارستان شهرستان',
            keyIndicatorBadge: 'کمبود دسترسی سلامت: ۴۵٪ (بحرانی)',
            urgency: 'HIGH',
            estimatedCostToman: 380_000_000_000,
            beneficiariesCount: 6500,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'دهستان راویز و روستاهای اقماری کشکوئیه',
            suggestedDeptId: healthDeptId,
            suggestedCrisisId: healthCrisisId,
            suggestedPriorityId: pHealth,
            suggestedBudgetShares: { csr: 85, gov: 15, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execHealth,
            suggestedContractorId: cntMedical,
            expectedOutcome: 'استقرار پزشک خانواده، مامای مقیم و پایگاه واکسیناسیون و کاهش مراجعات اورژانسی به مرکز شهر',
          },
          {
            id: 'kosh-health-2',
            title: 'احداث پایگاه اورژانس جاده‌ای ۱۱۵ و تجهیز آمبولانس کمک‌دار راویز - کشکوئیه',
            category: 'HEALTH',
            categoryFa: 'بهداشت و درمان',
            demographicRationale: 'امدادرسانی فوری در گردنه‌های کوهستانی صعب‌العبور و کاهش زمان طلایی نجات بیماران قلبی و سوانح جاده‌ای به زیر ۱۵ دقیقه',
            keyIndicatorBadge: 'زمان امدادرسانی فعلی: بیش از ۴۰ دقیقه',
            urgency: 'HIGH',
            estimatedCostToman: 280_000_000_000,
            beneficiariesCount: 14000,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'محور ارتباطی کشکوئیه به دهستان راویز',
            suggestedDeptId: healthDeptId,
            suggestedCrisisId: roadCrisisId,
            suggestedPriorityId: pHealth,
            suggestedBudgetShares: { csr: 90, gov: 10, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execHealth,
            suggestedContractorId: cntMedical,
            expectedOutcome: 'امدادرسانی شبانه‌روزی به سوانح جاده‌ای و اعزام سریع بیماران بدحال کوهستانی',
          },
        ];
      }
      if (selectedCategory === 'WATER') {
        return [
          {
            id: 'kosh-water-1',
            title: 'توسعه شبکه آب شرب و احداث مخزن ۱۰۰۰ مترمکعبی راویز',
            category: 'WATER',
            categoryFa: 'آب و فاضلاب',
            demographicRationale: 'شاخص کمبود زیرساخت ۵۴٪ (بالاترین در شهرستان) و تنش حاد آب شرب برای ۴,۲۰۰ نفر ساکنان روستاهای کوهستانی راویز در فصول گرم',
            keyIndicatorBadge: 'کمبود زیرساخت: ۵۴٪ | تنش آبی حاد',
            urgency: 'HIGH',
            estimatedCostToman: 850_000_000_000,
            beneficiariesCount: 4200,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'دهستان راویز و روستاهای اقماری کشکوئیه',
            suggestedDeptId: waterDeptId,
            suggestedCrisisId: waterCrisisId,
            suggestedPriorityId: pInfra,
            suggestedBudgetShares: { csr: 80, gov: 20, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execWater,
            suggestedContractorId: cntCivil,
            expectedOutcome: 'تأمین پایدار آب شرب بهداشتی ۲۴ ساعته و رفع جیره‌بندی آب در فصول گرم',
          },
          {
            id: 'kosh-water-2',
            title: 'تکمیل خط انتقال مجتمع آبرسانی کشکوئیه و تعویض لوله‌های فرسوده',
            category: 'WATER',
            categoryFa: 'آب و فاضلاب',
            demographicRationale: 'جلوگیری از هدررفت ۳۵ درصدی آب در شبکه سنتی و صیانت از آب شرب ۲۲,۰۰۰ نفر اهالی شهر و روستاهای دشت کشکوئیه',
            keyIndicatorBadge: 'پوشش ۲۲,۰۰۰ نفر ساکنان بخش',
            urgency: 'HIGH',
            estimatedCostToman: 650_000_000_000,
            beneficiariesCount: 22000,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'بخش کشکوئیه، شریف‌آباد و روستاهای تابعه',
            suggestedDeptId: waterDeptId,
            suggestedCrisisId: waterCrisisId,
            suggestedPriorityId: pInfra,
            suggestedBudgetShares: { csr: 70, gov: 20, dehyari: 10, bank: 0, charity: 0 },
            suggestedExecutorId: execWater,
            suggestedContractorId: cntCivil,
            expectedOutcome: 'کاهش پرتی آب، تثبیت فشار شبکه در اوج گرما و بهسازی خطوط لوله فرسوده',
          },
        ];
      }
      if (selectedCategory === 'ROAD') {
        return [
          {
            id: 'kosh-road-1',
            title: 'بهسازی، تعریض و رفع ۳ نقطه حادثه‌خیز محور کوهستانی کشکوئیه به راویز',
            category: 'ROAD',
            categoryFa: 'راه و حمل‌ونقل',
            demographicRationale: 'محور کوهستانی پرپیچ‌وخم، شیب‌های تند و خطر انقطاع ارتباط جاده‌ای اهالی در بارندگی‌های فصلی',
            keyIndicatorBadge: 'محور پرخطر کوهستانی و صعب‌العبور',
            urgency: 'HIGH',
            estimatedCostToman: 750_000_000_000,
            beneficiariesCount: 16000,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'محور کشکوئیه - راویز (کیلومتر ۱۰ الی ۲۸)',
            suggestedDeptId: roadDeptId,
            suggestedCrisisId: roadCrisisId,
            suggestedPriorityId: pInfra,
            suggestedBudgetShares: { csr: 75, gov: 25, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execCivil,
            suggestedContractorId: cntRoad,
            expectedOutcome: 'حذف پرتگاه‌های خطرناک، روکش آسفالت و افزایش ایمنی تردد ناوگان مسافر و بار',
          },
        ];
      }
      if (selectedCategory === 'EMPLOYMENT') {
        return [
          {
            id: 'kosh-emp-1',
            title: 'تسهیلات خوداشتغالی، فرآوری گیاهان دارویی کوهستان و بسته‌بندی پسته راویز',
            category: 'EMPLOYMENT',
            categoryFa: 'اشتغال و توانمندسازی',
            demographicRationale: 'نرخ بیکاری ۱۶.۵٪ و وجود ۸,۴۰۰ نفر اقشار آسیب‌پذیر و جوانان جویای کار در بخش کشکوئیه',
            keyIndicatorBadge: 'نرخ بیکاری: ۱۶.۵٪ | اقشار کم‌درآمد: ۸,۴۰۰ نفر',
            urgency: 'MEDIUM',
            estimatedCostToman: 450_000_000_000,
            beneficiariesCount: 2400,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'روستاهای دهستان راویز و بخش کشکوئیه',
            suggestedDeptId: welfareDeptId,
            suggestedCrisisId: socialCrisisId,
            suggestedPriorityId: pEcon,
            suggestedBudgetShares: { csr: 40, gov: 10, dehyari: 0, bank: 50, charity: 0 },
            suggestedExecutorId: execEcon,
            expectedOutcome: 'ایجاد اشتغال مستقیم برای ۳۵۰ جوان روستایی و ارزش افزوده محصولات بومی',
          },
        ];
      }
      if (selectedCategory === 'ENVIRONMENT') {
        return [
          {
            id: 'kosh-env-1',
            title: 'احداث بادشکن غیرزنده و احیای بیولوژیک مراتع در معرض فرسایش بادی کشکوئیه',
            category: 'ENVIRONMENT',
            categoryFa: 'محیط‌زیست و ریزگرد',
            demographicRationale: 'شاخص ریسک محیط‌زیستی ۶۶٪ و پیشروی ماسه‌های روان به سمت اراضی مسکونی و باغات پسته',
            keyIndicatorBadge: 'ریسک محیط‌زیستی: ۶۶٪',
            urgency: 'HIGH',
            estimatedCostToman: 520_000_000_000,
            beneficiariesCount: 14000,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'حریم روستاهای دشت کشکوئیه',
            suggestedDeptId: envDeptId,
            suggestedCrisisId: envCrisisId,
            suggestedPriorityId: pEnv,
            suggestedBudgetShares: { csr: 80, gov: 20, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execCivil,
            suggestedContractorId: cntEnv,
            expectedOutcome: 'تثبیت ۱۲۰ هکتار ماسه‌زار و مهار هجوم ریزگردها به بافت روستایی',
          },
        ];
      }
      if (selectedCategory === 'RURAL_HOUSING') {
        return [
          {
            id: 'kosh-house-1',
            title: 'اجرای طرح هادی، جدول‌گذاری و مقاوم‌سازی منازل خشت‌وگلی دهستان راویز',
            category: 'RURAL_HOUSING',
            categoryFa: 'مسکن و عمران روستایی',
            demographicRationale: 'کمبود زیرساخت کالبدی ۵۴٪ و آسیب‌پذیری شدید بافت روستایی در برابر زلزله و سیلاب کوهستانی',
            keyIndicatorBadge: 'کمبود زیرساخت کالبدی: ۵۴٪',
            urgency: 'HIGH',
            estimatedCostToman: 600_000_000_000,
            beneficiariesCount: 5500,
            district: 'بخش کشکوئیه و دهستان راویز',
            targetArea: 'روستاهای راویز و دهستان‌های تابعه کشکوئیه',
            suggestedDeptId: housingDeptId,
            suggestedCrisisId: waterCrisisId,
            suggestedPriorityId: pRural,
            suggestedBudgetShares: { csr: 60, gov: 30, dehyari: 10, bank: 0, charity: 0 },
            suggestedExecutorId: execCivil,
            suggestedContractorId: cntCivil,
            expectedOutcome: 'مقاوم‌سازی ۱۵۰ واحد مسکن روستایی و احداث کانال‌های مهار سیلاب',
          },
        ];
      }
      return [
        {
          id: 'kosh-edu-1',
          title: 'نوسازی مدارس فرسوده روستایی و تجهیز کارگاه فنی‌وحرفه‌ای کشکوئیه',
          category: 'EDUCATION',
          categoryFa: 'آموزش و مدارس',
          demographicRationale: 'نرخ ترک تحصیل ۱۸٪ و کمبود فضاهای استاندارد آموزشی و کارگاهی برای ۳,۲۰۰ دانش‌آموز بخش',
          keyIndicatorBadge: 'نرخ ترک تحصیل: ۱۸٪',
          urgency: 'MEDIUM',
          estimatedCostToman: 420_000_000_000,
          beneficiariesCount: 3200,
          district: 'بخش کشکوئیه و دهستان راویز',
          targetArea: 'بخش کشکوئیه و راویز',
          suggestedDeptId: eduDeptId,
          suggestedCrisisId: socialCrisisId,
          suggestedPriorityId: pEdu,
          suggestedBudgetShares: { csr: 70, gov: 20, dehyari: 10, bank: 0, charity: 0 },
          suggestedExecutorId: execCivil,
          expectedOutcome: 'ارتقای فضای آموزشی ۴ مدرسه و فراهم‌سازی مهارت‌آموزی شغلی نوجوانان',
        },
      ];
    }

    // --- CASE: NUQ & BAHREMAN ---
    if (isNuq) {
      if (selectedCategory === 'HEALTH') {
        return [
          {
            id: 'nuq-health-1',
            title: 'احداث خانه بهداشت روستایی دقوق‌آباد و تجهیز درمانگاه شبانه‌روزی بهرمان',
            category: 'HEALTH',
            categoryFa: 'بهداشت و درمان',
            demographicRationale: 'کمبود دسترسی سلامت ۴۲٪، دوری از بیمارستان مرکز و نیاز ۲۹,۰۰۰ نفر اهالی بخش نوق به خدمات دندانپزشکی، زایمان و اورژانس',
            keyIndicatorBadge: 'کمبود دسترسی سلامت: ۴۲٪',
            urgency: 'HIGH',
            estimatedCostToman: 580_000_000_000,
            beneficiariesCount: 29000,
            district: 'بخش نوق و شهر بهرمان',
            targetArea: 'شهر بهرمان و روستای دقوق‌آباد بخش نوق',
            suggestedDeptId: healthDeptId,
            suggestedCrisisId: healthCrisisId,
            suggestedPriorityId: pHealth,
            suggestedBudgetShares: { csr: 80, gov: 20, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execHealth,
            suggestedContractorId: cntMedical,
            expectedOutcome: 'بهره‌مندی ۲۹,۰۰۰ نفر از خدمات درمانی شبانه‌روزی بدون نیاز به تردد خطرناک به مرکز شهرستان',
          },
          {
            id: 'nuq-health-2',
            title: 'احداث پایگاه اورژانس جاده‌ای ۱۱۵ باقریه نوق با تجهیزات تریاژ پیش‌بیمارستانی',
            category: 'HEALTH',
            categoryFa: 'بهداشت و درمان',
            demographicRationale: 'پوشش حوادث سوانح جاده‌ای محور پرخطر نوق و ارتقای ایمنی سفرهای جاده‌ای',
            keyIndicatorBadge: 'پوشش سوانح جاده‌ای بخش نوق',
            urgency: 'HIGH',
            estimatedCostToman: 320_000_000_000,
            beneficiariesCount: 15000,
            district: 'بخش نوق و شهر بهرمان',
            targetArea: 'روستای باقریه و محور شریانی نوق',
            suggestedDeptId: healthDeptId,
            suggestedCrisisId: roadCrisisId,
            suggestedPriorityId: pHealth,
            suggestedBudgetShares: { csr: 85, gov: 15, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execHealth,
            suggestedContractorId: cntMedical,
            expectedOutcome: 'کاهش چشمگیر زمان رسیدن نیروهای امدادی بر بالین مصدومان حوادث جاده‌ای',
          },
        ];
      }
      if (selectedCategory === 'WATER') {
        return [
          {
            id: 'nuq-water-1',
            title: 'توسعه شبکه آبرسانی و تجهیز آب‌شیرین‌کن‌های خورشیدی روستاهای نوق',
            category: 'WATER',
            categoryFa: 'آب و فاضلاب',
            demographicRationale: 'شوری بحرانی آبخوان‌های دشت نوق (EC بالای ۵۰۰۰) و کمبود ۴۸ درصدی زیرساخت آب شرب گوارا',
            keyIndicatorBadge: 'شوری بحرانی آبخوان | کمبود زیرساخت: ۴۸٪',
            urgency: 'HIGH',
            estimatedCostToman: 950_000_000_000,
            beneficiariesCount: 29000,
            district: 'بخش نوق و شهر بهرمان',
            targetArea: 'شهر بهرمان، دقوق‌آباد و روستاهای بخش نوق',
            suggestedDeptId: waterDeptId,
            suggestedCrisisId: waterCrisisId,
            suggestedPriorityId: pInfra,
            suggestedBudgetShares: { csr: 75, gov: 25, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execWater,
            suggestedContractorId: cntCivil,
            expectedOutcome: 'تولید روزانه ۲,۰۰۰ مترمکعب آب شرب شیرین و ارتقای سلامت گوارشی اهالی',
          },
        ];
      }
      if (selectedCategory === 'ROAD') {
        return [
          {
            id: 'nuq-road-1',
            title: 'تعریض، دوبانده‌سازی و روشنایی محور شریانی رفسنجان - نوق (کیلومتر ۱۵ تا ۳۵)',
            category: 'ROAD',
            categoryFa: 'راه و حمل‌ونقل',
            demographicRationale: 'خطرناک‌ترین محور شهرستان با تلفات شاخ‌به‌شاخ، تردد روزانه ۵,۰۰۰ دستگاه خودرو و سهم بالای حمل بار پسته',
            keyIndicatorBadge: 'پرخطرترین محور حادثه‌خیز شهرستان',
            urgency: 'HIGH',
            estimatedCostToman: 1_100_000_000_000,
            beneficiariesCount: 29000,
            district: 'بخش نوق و شهر بهرمان',
            targetArea: 'محور شریانی رفسنجان - نوق (کیلومتر ۱۵ الی ۳۵)',
            suggestedDeptId: roadDeptId,
            suggestedCrisisId: roadCrisisId,
            suggestedPriorityId: pInfra,
            suggestedBudgetShares: { csr: 65, gov: 35, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execCivil,
            suggestedContractorId: cntRoad,
            expectedOutcome: 'دوبانده‌سازی ۲۰ کیلومتر از محور، نصب نیوجرسی و کاهش ۷۰ درصدی تصادفات مرگبار',
          },
        ];
      }
      if (selectedCategory === 'ENVIRONMENT') {
        return [
          {
            id: 'nuq-env-1',
            title: 'کمربند سبز بادشکن و مالچ‌بندی مراتع فرسایش‌یافته حاشیه دشت نوق',
            category: 'ENVIRONMENT',
            categoryFa: 'محیط‌زیست و ریزگرد',
            demographicRationale: 'شاخص ریسک محیط‌زیستی ۶۵٪ و هجوم طوفان‌های نمکی دشت به سوی مزارع و روستاها',
            keyIndicatorBadge: 'ریسک محیط‌زیستی: ۶۵٪',
            urgency: 'HIGH',
            estimatedCostToman: 680_000_000_000,
            beneficiariesCount: 20000,
            district: 'بخش نوق و شهر بهرمان',
            targetArea: 'اراضی کویری حاشیه بخش نوق',
            suggestedDeptId: envDeptId,
            suggestedCrisisId: envCrisisId,
            suggestedPriorityId: pEnv,
            suggestedBudgetShares: { csr: 80, gov: 20, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execCivil,
            suggestedContractorId: cntEnv,
            expectedOutcome: 'مهار طوفان‌های گردوغبار و حفظ حاصلخیزی باغات پسته منطقه',
          },
        ];
      }
      return [
        {
          id: 'nuq-emp-1',
          title: 'کارگاه‌های اشتغال خرد، فرآوری دانش‌بنیان پسته و توسعه صنایع تبدیلی نوق',
          category: 'EMPLOYMENT',
          categoryFa: 'اشتغال و کارآفرینی',
          demographicRationale: 'نرخ بیکاری ۱۵.۲٪ و نرخ فقر ۲۱.۳٪ در میان جوانان و فارغ‌التحصیلان بخش نوق',
          keyIndicatorBadge: 'نرخ فقر: ۲۱.۳٪ | بیکاری: ۱۵.۲٪',
          urgency: 'MEDIUM',
          estimatedCostToman: 500_000_000_000,
          beneficiariesCount: 1800,
          district: 'بخش نوق و شهر بهرمان',
          targetArea: 'بخش نوق و بهرمان',
          suggestedDeptId: welfareDeptId,
          suggestedCrisisId: socialCrisisId,
          suggestedPriorityId: pEcon,
          suggestedBudgetShares: { csr: 50, gov: 20, dehyari: 0, bank: 30, charity: 0 },
          suggestedExecutorId: execEcon,
          expectedOutcome: 'راه‌اندازی ۲۰ واحد کارگاهی فرآوری و صنایع جانبی پسته',
        },
      ];
    }

    // --- CASE: FERDOWS & SAFAIEH ---
    if (isFerdows) {
      if (selectedCategory === 'ENVIRONMENT') {
        return [
          {
            id: 'fer-env-1',
            title: 'احداث کمربند سبز بادشکن و تثبیت ماسه‌های روان در کانون فرسایش بادی صفائیه',
            category: 'ENVIRONMENT',
            categoryFa: 'محیط‌زیست و ریزگرد',
            demographicRationale: 'شاخص ریسک محیط‌زیستی ۶۷٪ (کانون بحرانی شهرستان) و خطر مدفون شدن منازل روستایی و باغات پسته ۲۳,۰۰۰ نفر اهالی',
            keyIndicatorBadge: 'ریسک محیط‌زیستی: ۶۷٪ (بحرانی‌ترین کانون فرسایش)',
            urgency: 'HIGH',
            estimatedCostToman: 890_000_000_000,
            beneficiariesCount: 23000,
            district: 'بخش فردوس و شهر صفائیه',
            targetArea: 'کانون فرسایش بادی دشت فردوس و حاشیه صفائیه',
            suggestedDeptId: envDeptId,
            suggestedCrisisId: envCrisisId,
            suggestedPriorityId: pEnv,
            suggestedBudgetShares: { csr: 85, gov: 15, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execCivil,
            suggestedContractorId: cntEnv,
            expectedOutcome: 'تثبیت ۲۰۰ هکتار تپه‌های ماسه‌ای روان و محافظت از اراضی مسکونی و کشاورزی بخش',
          },
        ];
      }
      if (selectedCategory === 'HEALTH') {
        return [
          {
            id: 'fer-health-1',
            title: 'احداث خانه بهداشت صفائیه و تجهیز درمانگاه روستایی فردوس به واحد دندانپزشکی',
            category: 'HEALTH',
            categoryFa: 'بهداشت و درمان',
            demographicRationale: 'نرخ فقر ۲۲.۱٪ و کمبود دسترسی درمانی ۴۳٪ که امکان پرداخت هزینه‌های درمانی را برای ۵,۱۰۰ مددجوی نیازمند محدود کرده است',
            keyIndicatorBadge: 'نرخ فقر: ۲۲.۱٪ | کمبود سلامت: ۴۳٪',
            urgency: 'HIGH',
            estimatedCostToman: 340_000_000_000,
            beneficiariesCount: 9500,
            district: 'بخش فردوس و شهر صفائیه',
            targetArea: 'شهر صفائیه و روستاهای پیرامونی بخش فردوس',
            suggestedDeptId: healthDeptId,
            suggestedCrisisId: healthCrisisId,
            suggestedPriorityId: pHealth,
            suggestedBudgetShares: { csr: 85, gov: 15, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execHealth,
            suggestedContractorId: cntMedical,
            expectedOutcome: 'ارائه خدمات درمانی اولیه، دندانپزشکی و مامایی رایگان برای اهالی کم‌برخوردار',
          },
        ];
      }
      if (selectedCategory === 'WATER') {
        return [
          {
            id: 'fer-water-1',
            title: 'توسعه شبکه آبرسانی، بهسازی قنوات و حفر چاه جایگزین در روستاهای فردوس',
            category: 'WATER',
            categoryFa: 'آب و فاضلاب',
            demographicRationale: 'کمبود زیرساخت ۵۰٪ و افت مداوم سطح سفره‌های آب شرب در روستاهای بخش فردوس',
            keyIndicatorBadge: 'کمبود زیرساخت: ۵۰٪ | تنش آب شرب',
            urgency: 'HIGH',
            estimatedCostToman: 720_000_000_000,
            beneficiariesCount: 18000,
            district: 'بخش فردوس و شهر صفائیه',
            targetArea: 'شهر صفائیه و روستاهای دشت فردوس',
            suggestedDeptId: waterDeptId,
            suggestedCrisisId: waterCrisisId,
            suggestedPriorityId: pInfra,
            suggestedBudgetShares: { csr: 75, gov: 25, dehyari: 0, bank: 0, charity: 0 },
            suggestedExecutorId: execWater,
            suggestedContractorId: cntCivil,
            expectedOutcome: 'پایداری آب شرب برای ۱۸,۰۰۰ نفر و احیای ۳ رشته قنات حیاتی منطقه',
          },
        ];
      }
      return [
        {
          id: 'fer-road-1',
          title: 'احداث تقاطع ایمن ورودی شهر صفائیه و روشنایی نقاط تاریک جاده‌ای بخش فردوس',
          category: 'ROAD',
          categoryFa: 'راه و حمل‌ونقل',
          demographicRationale: 'کاهش سوانح در ورودی مراکز جمعیتی و ایمن‌سازی تردد کشاورزان و ساکنان محلی',
          keyIndicatorBadge: 'اصلاح تقاطع پرخطر ورودی شهر',
          urgency: 'MEDIUM',
          estimatedCostToman: 480_000_000_000,
          beneficiariesCount: 12000,
          district: 'بخش فردوس و شهر صفائیه',
          targetArea: 'ورودی صفائیه و محورهای روستایی فردوس',
          suggestedDeptId: roadDeptId,
          suggestedCrisisId: roadCrisisId,
          suggestedPriorityId: pInfra,
          suggestedBudgetShares: { csr: 70, gov: 30, dehyari: 0, bank: 0, charity: 0 },
          suggestedExecutorId: execCivil,
          suggestedContractorId: cntRoad,
          expectedOutcome: 'کاهش تصادفات ورودی شهر صفائیه و ایمن‌سازی تردد ادوات کشاورزی',
        },
      ];
    }

    // --- CASE: CENTRAL & RAFSANJAN CITY (or Countywide) ---
    if (selectedCategory === 'HEALTH') {
      return [
        {
          id: 'cen-health-1',
          title: 'احداث و تجهیز بخش فوق‌تخصصی اورژانس مسمومیت‌ها، دیالیز و سلامت روان',
          category: 'HEALTH',
          categoryFa: 'بهداشت و درمان',
          demographicRationale: 'کانون ارجاع کل شهرستان، وجود ۱۸,۵۰۰ نفر مددجوی آسیب‌پذیر و حوادث مسمومیت متانول با شاخص آسیب‌های اجتماعی ۴۴',
          keyIndicatorBadge: 'شاخص آسیب‌های اجتماعی: ۴۴ | مسمومیت‌های حاد',
          urgency: 'CRITICAL',
          estimatedCostToman: 850_000_000_000,
          beneficiariesCount: 14500,
          district: isCounty ? 'کل شهرستان رفسنجان' : 'بخش مرکزی و شهر رفسنجان',
          targetArea: 'مرکز آموزشی درمانی علی‌ابن‌ابیطالب (ع) رفسنجان',
          suggestedDeptId: healthDeptId,
          suggestedCrisisId: healthCrisisId,
          suggestedPriorityId: pHealth,
          suggestedBudgetShares: { csr: 90, gov: 10, dehyari: 0, bank: 0, charity: 0 },
          suggestedExecutorId: execHealth,
          suggestedContractorId: cntMedical,
          expectedOutcome: 'کاهش مرگ‌ومیر ناشی از مسمومیت‌های حاد متانول و بستری سالانه ۲,۰۰۰ بیمار روان‌پزشکی و دیالیزی',
        },
        {
          id: 'cen-health-2',
          title: 'احداث پایگاه سلامت و خانه بهداشت در سکونتگاه‌های غیررسمی رحمت‌آباد و صادق‌آباد',
          category: 'HEALTH',
          categoryFa: 'بهداشت و درمان',
          demographicRationale: 'نرخ حاشیه‌نشینی ۱۱.۲٪، استقرار جمعیت مهاجر و کم‌بضاعت و لزوم خدمات بهداشتی رایگان مادر و کودک',
          keyIndicatorBadge: 'نرخ حاشیه‌نشینی: ۱۱.۲٪ (سکونتگاه‌های غیررسمی)',
          urgency: 'HIGH',
          estimatedCostToman: 420_000_000_000,
          beneficiariesCount: 24000,
          district: 'بخش مرکزی و شهر رفسنجان',
          targetArea: 'محلات حاشیه‌نشین رحمت‌آباد، صادق‌آباد و علی‌آباد رفسنجان',
          suggestedDeptId: healthDeptId,
          suggestedCrisisId: healthCrisisId,
          suggestedPriorityId: pHealth,
          suggestedBudgetShares: { csr: 80, gov: 20, dehyari: 0, bank: 0, charity: 0 },
          suggestedExecutorId: execHealth,
          suggestedContractorId: cntMedical,
          expectedOutcome: 'پوشش کامل واکسیناسیون، غربالگری و بهداشت مادر و کودک برای ۲۴,۰۰۰ ساکن مناطق حاشیه‌ای',
        },
      ];
    }
    if (selectedCategory === 'WATER') {
      return [
        {
          id: 'cen-water-1',
          title: 'تکمیل تصفیه‌خانه تکمیلی و بازچرخانی پساب شهری رفسنجان جهت صنایع مس و فضای سبز',
          category: 'WATER',
          categoryFa: 'آب و فاضلاب',
          demographicRationale: 'پوشش ۲۲۲,۰۰۰ نفر جمعیت شهری و جایگزینی آب مصرفی صنعتی مس با پساب تصفیه‌شده جهت صیانت از سفره‌های آب شرب',
          keyIndicatorBadge: 'صیانت از آب شرب ۲۲۲,۰۰۰ نفر شهروند',
          urgency: 'HIGH',
          estimatedCostToman: 1_200_000_000_000,
          beneficiariesCount: 222000,
          district: isCounty ? 'کل شهرستان رفسنجان' : 'بخش مرکزی و شهر رفسنجان',
          targetArea: 'محدوده شهری رفسنجان و خطوط تصفیه پساب',
          suggestedDeptId: waterDeptId,
          suggestedCrisisId: waterCrisisId,
          suggestedPriorityId: pInfra,
          suggestedBudgetShares: { csr: 70, gov: 30, dehyari: 0, bank: 0, charity: 0 },
          suggestedExecutorId: execWater,
          suggestedContractorId: cntCivil,
          expectedOutcome: 'آزادسازی سالانه ۸ میلیون مترمکعب آب شرب باکیفیت و جایگزینی پساب در فرآیندهای صنعتی',
        },
      ];
    }
    if (selectedCategory === 'EMPLOYMENT') {
      return [
        {
          id: 'cen-emp-1',
          title: 'وام‌های قرض‌الحسنه خوداشتغالی و مهارت‌آموزی به معتادان بهبودیافته ماده ۱۶ و زنان سرپرست خانوار',
          category: 'EMPLOYMENT',
          categoryFa: 'اشتغال و کارآفرینی',
          demographicRationale: 'شاخص آسیب‌های اجتماعی ۴۴، تمرکز ۱۸,۵۰۰ نفر افراد آسیب‌پذیر و لزوم بازپروری شغلی جهت جلوگیری از بازگشت به اعتیاد',
          keyIndicatorBadge: 'اقشار آسیب‌پذیر: ۱۸,۵۰۰ نفر | شاخص آسیب اجتماعی: ۴۴',
          urgency: 'HIGH',
          estimatedCostToman: 800_000_000_000,
          beneficiariesCount: 2500,
          district: 'بخش مرکزی و شهر رفسنجان',
          targetArea: 'شهر رفسنجان و کمپ بازپروری ماده ۱۶',
          suggestedDeptId: welfareDeptId,
          suggestedCrisisId: socialCrisisId,
          suggestedPriorityId: pEcon,
          suggestedBudgetShares: { csr: 50, gov: 20, dehyari: 0, bank: 30, charity: 0 },
          suggestedExecutorId: execEcon,
          expectedOutcome: 'اشتغال‌زایی پایدار برای ۵۰۰ فرد آسیب‌دیده و کاهش بازگشت به چرخه اعتیاد به زیر ۲۰٪',
        },
      ];
    }
    if (selectedCategory === 'RURAL_HOUSING') {
      return [
        {
          id: 'cen-house-1',
          title: 'ساماندهی معابر، بهسازی محیطی و احداث سرای محله در بافت حاشیه‌نشین و ناکارآمد شهری',
          category: 'RURAL_HOUSING',
          categoryFa: 'عمران و بازآفرینی شهری',
          demographicRationale: 'ارتقای کرامت انسانی و بهداشت محیط در سکونتگاه‌های غیررسمی با جمعیت بیش از ۲۰,۰۰۰ نفر',
          keyIndicatorBadge: 'بازآفرینی سکونتگاه‌های غیررسمی: ۲۰,۰۰۰ نفر',
          urgency: 'HIGH',
          estimatedCostToman: 650_000_000_000,
          beneficiariesCount: 20000,
          district: 'بخش مرکزی و شهر رفسنجان',
          targetArea: 'محلات حاشیه‌ای رفسنجان',
          suggestedDeptId: housingDeptId,
          suggestedCrisisId: socialCrisisId,
          suggestedPriorityId: pInfra,
          suggestedBudgetShares: { csr: 60, gov: 40, dehyari: 0, bank: 0, charity: 0 },
          suggestedExecutorId: execCivil,
          suggestedContractorId: cntCivil,
          expectedOutcome: 'آسفالت و روشنایی ۳۵ هکتار از معابر خاکی و ایجاد فضاهای فرهنگی-آموزشی محله',
        },
      ];
    }

    // Default Fallback Suggestions
    return [
      {
        id: 'gen-1',
        title: `توسعه زیرساخت‌ها و خدمات اولویت‌دار ${locName}`,
        category: selectedCategory,
        categoryFa: PROJECT_CATEGORIES.find((c) => c.key === selectedCategory)?.labelFa || 'عمومی',
        demographicRationale: `بر اساس شاخص‌های آمایش سرزمینی و توزیع جمعیتی در ${locName}`,
        keyIndicatorBadge: `پوشش جمعیتی منطقه: ${formatNumber(activeLocationData?.totalPopulation || 50000)} نفر`,
        urgency: 'HIGH',
        estimatedCostToman: 500_000_000_000,
        beneficiariesCount: Math.round((activeLocationData?.totalPopulation || 50000) * 0.25),
        district: locName,
        targetArea: `حوزه نفوذ ${locName}`,
        suggestedDeptId: departments[0]?.id || 'dept-01',
        suggestedCrisisId: crisesHarms[0]?.id || 'crisis-01',
        suggestedPriorityId: priorities[0]?.id || 'p1',
        suggestedBudgetShares: { csr: 70, gov: 20, dehyari: 10, bank: 0, charity: 0 },
        suggestedExecutorId: executors[0]?.id,
        suggestedContractorId: contractors[0]?.id,
        expectedOutcome: 'بهبود شاخص‌های توسعه‌ای و افزایش رضایت‌مندی شهروندان منطقه',
      },
    ];
  }, [
    district,
    selectedCategory,
    activeLocationData,
    departments,
    crisesHarms,
    priorities,
    executors,
    contractors,
  ]);

  // Handler to apply a smart demographic priority to the form
  const handleApplyDemographicPriority = (p: DemographicPrioritySuggestion) => {
    setTitle(p.title);
    setDistrict(p.district);
    setTargetArea(p.targetArea);
    setBeneficiariesCount(p.beneficiariesCount);
    setEstimatedCostToman(p.estimatedCostToman);
    setCurrentYearAllocatedToman(Math.round(p.estimatedCostToman * 0.6));
    setFutureYearsAllocatedToman(Math.round(p.estimatedCostToman * 0.4));
    setPrimaryDeptId(p.suggestedDeptId);
    setRequestingDeptId(p.suggestedDeptId);
    setSelectedCrisisId(p.suggestedCrisisId);
    setSelectedPriorityId(p.suggestedPriorityId);
    setCsrSharePct(p.suggestedBudgetShares.csr);
    setGovSharePct(p.suggestedBudgetShares.gov);
    setDehyariSharePct(p.suggestedBudgetShares.dehyari);
    setBankSharePct(p.suggestedBudgetShares.bank);
    setCharitySharePct(p.suggestedBudgetShares.charity);
    setUrgency(p.urgency);
    setExecutorId(p.suggestedExecutorId);
    if (p.suggestedContractorId) {
      setContractorId(p.suggestedContractorId);
    }
    setDescription(
      `پروژه مصوب بر پایه تحلیل داده‌های دموگرافیک و شاخص‌های محرومیت ${p.district}. ${p.demographicRationale}. دستاورد مورد انتظار: ${p.expectedOutcome}.`
    );
    setAppliedPriorityNotice(p.title);
    setTimeout(() => {
      setAppliedPriorityNotice(null);
    }, 6000);
  };

  // Quick preset loader for demonstration
  const handleLoadSampleProject = (sampleTitle: string, sampleDistrict?: string, sampleTargetArea?: string) => {
    setTitle(sampleTitle);
    if (sampleDistrict) setDistrict(sampleDistrict);
    if (sampleTargetArea) setTargetArea(sampleTargetArea);
  };

  // Auto-balance budget shares
  const handleAutoBalanceShares = () => {
    setCsrSharePct(60);
    setGovSharePct(25);
    setDehyariSharePct(15);
    setBankSharePct(0);
    setCharitySharePct(0);
  };

  // Submit Handler
  const handleSubmitProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('لطفاً عنوان کامل پروژه را وارد نمایید.');
      return;
    }

    const newProjectData: Omit<ExecutiveProject, 'id' | 'costPerBeneficiaryToman' | 'antiOverlapStatus'> = {
      code,
      title: title.trim(),
      priorityId: selectedPriorityId,
      priorityTitle: selectedPriority?.title || 'اولویت عمومی',
      departmentId: primaryDeptId,
      departmentName: primaryDept?.name || 'دستگاه اجرایی',
      requestingDepartmentId: requestingDeptId,
      requestingDepartmentName: requestingDept?.name || 'اداره متقاضی',
      isMultiDepartment: isMultiDept && contributingDepts.length > 0,
      contributingDepartments: isMultiDept ? contributingDepts : [],
      budgetSourceId: primaryBudgetSourceId,
      budgetSourceName: primaryBudgetSource?.title || 'منابع مسئولیت اجتماعی',
      executorId,
      executorName: selectedExecutor?.name || 'مجری طرح',
      contractorId: selectedContractor ? contractorId : undefined,
      contractorName: selectedContractor ? selectedContractor.companyName : undefined,
      crisisHarmId: selectedCrisisId,
      crisisHarmTitle: selectedCrisis?.title,
      urgencyLevel: urgency,
      administrativeLevel: adminLevel,
      province,
      county,
      district,
      targetArea: targetArea.trim() || district,
      estimatedCostToman,
      currentYearAllocatedToman,
      futureYearsAllocatedToman,
      csrSharePercentage: csrSharePct,
      governmentSharePercentage: govSharePct,
      dehyariSharePercentage: dehyariSharePct,
      bankFacilitySharePercentage: bankSharePct,
      charitySharePercentage: charitySharePct,
      beneficiariesCount,
      targetBeneficiaryGroups: selectedBeneficiaryGroups,
      overlapWarningDetails: potentialDuplicates.length > 0 ? `احتمال همپوشانی با پروژه ${potentialDuplicates[0].code}` : undefined,
      status,
      startYear,
      endYear,
      durationMonths,
      progressPercentage: status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 25 : 0,
      description: description.trim(),
    };

    handleAddProject(newProjectData);
    setSubmittedSuccess(true);
  };

  const handleResetForm = () => {
    setTitle('');
    setCode(`PRJ-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(100 + Math.random() * 900)}`);
    setDescription('');
    setBeneficiariesCount(5000);
    setContributingDepts([]);
    setIsMultiDept(false);
    setSubmittedSuccess(false);
    setActiveStep(1);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-lg text-xs font-semibold text-blue-200 border border-white/15 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              موتور هوشمند تجمیع و پیوند تمامی تب‌ها
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3">
              <FolderPlus className="w-7 h-7 text-indigo-300" />
              سامانه جامع تعریف، تجمیع و ثبت هوشمند پروژه
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              این ماژول کلیه ارکان سامانه شامل{' '}
              <span className="text-white font-medium">منابع بودجه‌ای (دولتی، CSR، عوارض)، ادارات متقاضی و همکار، اولویت‌ها، کانون‌های آسیب، مجریان و جامعه هدف جمعیتی</span>{' '}
              را در قالب یک پرونده متصل و استاندارد یکپارچه می‌کند.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('PROJECTS')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/20 transition-all flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              مشاهده رصد پروژه‌ها ({projects.length})
            </button>
          </div>
        </div>

        {/* Interconnected Tabs Legend */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
            <Building2 className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="text-slate-200">تب ادارات: سهم و مشارکت</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
            <Wallet className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="text-slate-200">تب بودجه: چندمنبعی (CSR/دولت)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
            <Scale className="w-4 h-4 text-purple-300 shrink-0" />
            <span className="text-slate-200">تب اولویت‌ها: وزن استراتژیک</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
            <Flame className="w-4 h-4 text-rose-300 shrink-0" />
            <span className="text-slate-200">تب بحران: کانون و فوریت</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
            <Users2 className="w-4 h-4 text-cyan-300 shrink-0" />
            <span className="text-slate-200">تب مجریان و پیمانکاران</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/10">
            <Users className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-slate-200">تب جمعیت: افراد ذینفع و محروم</span>
          </div>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {submittedSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-500/30 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl text-white flex items-center justify-center shrink-0 shadow-md">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-900">پروژه با موفقیت در سامانه ملی ثبت شد</h3>
              <p className="text-xs text-emerald-700 mt-1">
                اطلاعات به صورت یکپارچه در داشبورد، ماتریس اولویت‌ها، اعتبارات دستگاه‌ها و جدول رصد پروژه‌ها درج شد.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResetForm}
              className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-colors shadow-sm"
            >
              ثبت پروژه جدید دیگر
            </button>
            <button
              onClick={() => setActiveTab('PROJECTS')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              انتقال به رصد پروژه‌ها
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Form + Live Project Passport Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Form (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Smart Demographic Priority Recommendations Panel */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700/60 relative overflow-hidden">
            {/* Subtle decorative background glow */}
            <div className="absolute -left-12 -top-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white tracking-tight">
                      دستیار برنامه‌ریزی دموگرافیک و اولویت‌های پیشنهادی منطقه
                    </h2>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30 font-semibold">
                      هوشمند آمایشی
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    بر اساس داده‌های جمعیتی، محرومیت و زیرساخت هر منطقه، اولویت‌های پیشنهادی متناسب نمایش داده می‌شوند.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPlannerExpanded(!plannerExpanded)}
                className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
              >
                {plannerExpanded ? (
                  <>
                    <span>جمع‌کردن پنل</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>نمایش اولویت‌های پیشنهادی</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Applied Priority Notification Banner */}
            {appliedPriorityNotice && (
              <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    اولویت <strong>«{appliedPriorityNotice}»</strong> با موفقیت در فرم اعمال شد (عنوان، بودجه، سهم CSR، جمعیت هدف و دستگاه متولی تنظیم گردید).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAppliedPriorityNotice(null)}
                  className="text-emerald-400 hover:text-emerald-200 text-xs font-bold mr-2 cursor-pointer"
                >
                  بستن
                </button>
              </div>
            )}

            {/* Expanded Content */}
            {plannerExpanded && (
              <div className="mt-4 space-y-4 relative z-10">
                {/* Filter Controls: Location Selector + Category Selector */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  {/* Location Select (5 cols) */}
                  <div className="md:col-span-5 bg-white/5 rounded-xl p-3 border border-white/10">
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>مکان اجرای پروژه (بخش هدف):</span>
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-xs font-bold bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                    >
                      <option value="بخش کشکوئیه و دهستان راویز">بخش کشکوئیه و دهستان راویز (جمعیت: ۴۱,۰۰۰)</option>
                      <option value="بخش نوق و شهر بهرمان">بخش نوق و شهر بهرمان (جمعیت: ۲۹,۰۰۰)</option>
                      <option value="بخش فردوس و شهر صفائیه">بخش فردوس و شهر صفائیه (جمعیت: ۲۳,۰۰۰)</option>
                      <option value="بخش مرکزی و شهر رفسنجان">بخش مرکزی و شهر رفسنجان (جمعیت: ۲۲۲,۰۰۰)</option>
                      <option value="کل شهرستان رفسنجان">کل شهرستان رفسنجان (جمعیت: ۳۱۵,۰۰۰)</option>
                    </select>
                  </div>

                  {/* Project Category / Domain Selector (7 cols) */}
                  <div className="md:col-span-7 bg-white/5 rounded-xl p-3 border border-white/10">
                    <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>نوع پروژه و حوزه مأموریت:</span>
                      </div>
                      <span className="text-[10px] text-slate-400">یک حوزه را انتخاب کنید</span>
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PROJECT_CATEGORIES.map((cat) => {
                        const IconComponent = cat.icon;
                        const isSelected = selectedCategory === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? `${cat.activeBg} border-transparent shadow-md`
                                : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <IconComponent className="w-3.5 h-3.5 shrink-0" />
                            <span>{cat.labelFa}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Regional Demographic Snapshot Bar */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>شناسنامه شاخص‌های دموگرافیک {activeLocationData?.nameFa || district}:</span>
                    </span>
                    <span className="text-[10px] text-slate-400">منبع داده: سرشماری و اطلس محرومیت رفسنجان</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-400">جمعیت کل</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        {formatNumber(activeLocationData?.totalPopulation || 0)} نفر
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <div className="text-[10px] text-amber-300">اقشار آسیب‌پذیر</div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">
                        {formatNumber(activeLocationData?.vulnerablePopulation || 0)} نفر
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <div className="text-[10px] text-rose-300">کمبود زیرساخت</div>
                      <div className="text-xs font-bold text-rose-400 mt-0.5">
                        {activeLocationData?.indicators.infrastructureDeficitPct}%
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <div className="text-[10px] text-cyan-300">کمبود دسترسی سلامت</div>
                      <div className="text-xs font-bold text-cyan-400 mt-0.5">
                        {activeLocationData?.indicators.healthAccessDeficitPct}%
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <div className="text-[10px] text-purple-300">نرخ فقر / بیکاری</div>
                      <div className="text-xs font-bold text-purple-400 mt-0.5">
                        {activeLocationData?.indicators.povertyRatePct}%
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-white/5">
                      <div className="text-[10px] text-emerald-300">ریسک محیط‌زیستی</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">
                        {activeLocationData?.indicators.environmentalRiskScore}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Priority Cards List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        اولویت‌های پیشنهادی هوشمند برای {district} (حوزه{' '}
                        {PROJECT_CATEGORIES.find((c) => c.key === selectedCategory)?.labelFa}):
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {demographicPrioritySuggestions.length} پروژه اولویت‌دار شناسایی شد
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {demographicPrioritySuggestions.map((prop, idx) => (
                      <div
                        key={prop.id}
                        className="bg-white/5 hover:bg-white/[0.08] transition-all rounded-xl p-3.5 border border-white/10 hover:border-cyan-500/40 relative group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-2 py-0.5 rounded-md">
                                اولویت پیشنهادی {idx + 1}
                              </span>
                              <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md border border-white/10">
                                {prop.categoryFa}
                              </span>
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30 font-medium">
                                {prop.keyIndicatorBadge}
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors">
                              {prop.title}
                            </h3>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              <strong className="text-cyan-300 font-semibold">تحلیل دموگرافیک: </strong>
                              {prop.demographicRationale}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-1">
                              <span>
                                برآورد بودجه:{' '}
                                <strong className="text-emerald-300 font-bold">
                                  {formatToman(prop.estimatedCostToman)}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                جمعیت هدف مستقیم:{' '}
                                <strong className="text-white font-bold">
                                  {formatNumber(prop.beneficiariesCount)} نفر
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                محل تمرکز: <strong className="text-slate-200">{prop.targetArea}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Apply Button */}
                          <div className="shrink-0 flex sm:flex-col items-end justify-between gap-2 border-t sm:border-t-0 sm:border-r sm:border-white/10 pt-2 sm:pt-0 sm:pr-3">
                            <button
                              type="button"
                              onClick={() => handleApplyDemographicPriority(prop)}
                              className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                              <span>اعمال در فرم پروژه</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitProject} className="space-y-6">
            {/* Section 1: Basic Project Profile */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    ۱
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">مشخصات پایه و شناسنامه طرح</h2>
                    <p className="text-xs text-slate-500">عنوان، کد یکتا، بازه زمانی و وضعیت اولیه پروژه</p>
                  </div>
                </div>
                <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                  {code}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عنوان کامل و دقیق پروژه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تکمیل مجتمع آبرسانی، بهسازی شبکه شرب و احداث مخزن ۱۰۰۰ مترمکعبی"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وضعیت فرآیندی طرح</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PROPOSED">پیشنهادی (در انتظار تصویب)</option>
                    <option value="APPROVED">مصوب و آماده تأمین مالی</option>
                    <option value="IN_PROGRESS">در حال اجرا و عملیات</option>
                    <option value="COMPLETED">تکمیل و بهره‌برداری شده</option>
                    <option value="SUSPENDED">معلق یا بازنگری فنی</option>
                  </select>
                </div>
              </div>

              {/* Smart Assistance & Recommendation Banner based on Title & Location */}
              {smartInference.hasSignal ? (
                <div className="p-3 bg-gradient-to-l from-indigo-50/90 via-blue-50/70 to-slate-50 border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-2">
                        <span>تشخیص هوشمند مشخصات طرح:</span>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[11px] font-bold">
                          {smartInference.domainLabel}
                        </span>
                        <span className="text-slate-500 text-[11px]">|</span>
                        <span className="text-slate-700 text-[11px]">
                          موقعیت: <strong className="text-indigo-900">{smartInference.districtNameFa}</strong>
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        پیشنهاد جمعیت بهره‌بردار: <strong className="text-indigo-700">{formatNumber(smartInference.suggestedBeneficiaries)} نفر</strong> ({smartInference.suggestedBeneficiariesReason})
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyAllSmartSuggestions}
                    className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تکمیل هوشمند تمامی فیلدها</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>نمونه‌های آماده طرح‌های محوری رفسنجان جهت بررسی و اعمال هوشمند:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { t: 'آبرسانی پایدار به روستاهای تنش‌دار کشکوئیه و دهستان راویز', d: 'بخش کشکوئیه و دهستان راویز', a: 'دهستان راویز و روستاهای تابعه' },
                      { t: 'تعریض، روشنایی و ایمن‌سازی نقاط حادثه‌خیز محور رفسنجان - نوق', d: 'بخش نوق و شهر بهرمان', a: 'کیلومتر ۱۵ تا ۳۵ محور نوق' },
                      { t: 'احداث و تجهیز اورژانس مسمومیت‌ها و بخش دیالیز بیمارستان علی‌ابن‌ابیطالب', d: 'بخش مرکزی و شهر رفسنجان', a: 'مرکز آموزشی درمانی رفسنجان' },
                      { t: 'تسهیلات خوداشتغالی و کارگاه‌های مهارت‌آموزی فنی‌وحرفه‌ای جوانان جویای کار', d: 'کل شهرستان رفسنجان', a: 'سطح شهرستان و بخش‌های تابعه' },
                      { t: 'احداث کمربند سبز بادشکن و تثبیت ماسه‌های روان دشت رفسنجان', d: 'بخش فردوس و شهر صفائیه', a: 'کانون بحران فرسایش بادی فردوس' },
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleLoadSampleProject(sample.t, sample.d, sample.a)}
                        className="text-[11px] px-2 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 border border-slate-200 rounded-lg transition-colors text-right"
                      >
                        {sample.t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سال آغاز عملیات</label>
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سال پیش‌بینی پایان</label>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدت زمان اجرا (ماه)</label>
                  <input
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شرح اهداف، دامنه کار و ضرورت اجرایی</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="تشریح ضرورت رفع بحران، جزئیات فنی و خروجی مورد انتظار پس از بهره‌برداری کامل..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Section 2: Department Governance & Multi-Department Collaboration */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    ۲
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">حکمرانی دستگاهی و پروژه‌های چنداداره‌ای</h2>
                    <p className="text-xs text-slate-500">
                      تعیین اداره متقاضی، دستگاه متولی اصلی و سهم مشارکت سایر دستگاه‌های اجرایی (همکاری بین‌بخشی)
                    </p>
                  </div>
                </div>
                <Building2 className="w-5 h-5 text-indigo-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      اداره متقاضی / پیشنهاددهنده طرح
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedDept && requestingDeptId !== smartInference.suggestedDeptId && (
                      <button
                        type="button"
                        onClick={() => setRequestingDeptId(smartInference.suggestedDeptId)}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        <span>پیشنهاد: {smartInference.suggestedDept.categoryFa}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={requestingDeptId}
                    onChange={(e) => setRequestingDeptId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.categoryFa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      دستگاه اجرایی متولی اصلی و پاسخگو <span className="text-rose-500">*</span>
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedDept && primaryDeptId !== smartInference.suggestedDeptId && (
                      <button
                        type="button"
                        onClick={() => setPrimaryDeptId(smartInference.suggestedDeptId)}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        <span>پیشنهاد هوشمند: {smartInference.suggestedDept.name.split(' ')[0]} {smartInference.suggestedDept.name.split(' ')[1] || ''}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={primaryDeptId}
                    onChange={(e) => setPrimaryDeptId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.contactPerson})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Department Toggle */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="multiDeptCheck"
                      checked={isMultiDept}
                      onChange={(e) => setIsMultiDept(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="multiDeptCheck" className="text-xs font-bold text-indigo-950 cursor-pointer">
                      این طرح یک پروژه مشترک برای چند اداره / دستگاه اجرایی است (مشارکت بین‌دستگاهی)
                    </label>
                  </div>
                  {isMultiDept && (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                      {contributingDepts.length} اداره همکار اضافه شده
                    </span>
                  )}
                </div>

                {isMultiDept && (
                  <div className="space-y-3 pt-2 border-t border-indigo-200/50">
                    <p className="text-[11px] text-indigo-800">
                      برای تسهیم اعتبارات و جلوگیری از ادعای همزمان چند دستگاه بر سر یک پروژه، سهم هر اداره و وظیفه اجرایی را معین نمایید:
                    </p>

                    {/* Add Contributing Department Row */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-white p-3 rounded-xl border border-indigo-200">
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">انتخاب اداره همکار</label>
                        <select
                          value={newContribDeptId}
                          onChange={(e) => setNewContribDeptId(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5"
                        >
                          {departments
                            .filter((d) => d.id !== primaryDeptId)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">درصد سهم / مشارکت (٪)</label>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={newContribPct}
                          onChange={(e) => setNewContribPct(Number(e.target.value))}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">مسئولیت و شرح اقدام</label>
                        <input
                          type="text"
                          value={newContribRole}
                          onChange={(e) => setNewContribRole(e.target.value)}
                          placeholder="مثلاً: صدور مجوز حفاری و نظارت فنی"
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5"
                        />
                      </div>

                      <div className="md:col-span-1 pt-4">
                        <button
                          type="button"
                          onClick={handleAddContributingDept}
                          className="w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center shadow-sm"
                          title="افزودن اداره همکار"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contributing Departments List */}
                    {contributingDepts.length > 0 && (
                      <div className="space-y-2">
                        {contributingDepts.map((c) => {
                          const deptShareToman = Math.round((estimatedCostToman * c.sharePercentage) / 100);
                          return (
                            <div
                              key={c.departmentId}
                              className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                <div>
                                  <span className="font-bold text-slate-800">{c.departmentName}</span>
                                  <span className="text-slate-400 mx-2">|</span>
                                  <span className="text-slate-500 text-[11px]">{c.roleDescription}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="text-left">
                                  <span className="font-bold text-indigo-700">{c.sharePercentage}٪</span>
                                  <span className="text-[11px] text-slate-500 mr-2">
                                    ({formatToman(deptShareToman)})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContributingDept(c.departmentId)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Strategic Priorities & Crisis Alignment */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                    ۳
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">ارتباط با اولویت‌های توسعه و بحران‌های هدف</h2>
                    <p className="text-xs text-slate-500">
                      انتخاب کانون آسیب تحت پوشش (از تب بحران‌ها) و سرفصل مصوب استراتژیک (از تب اولویت‌ها)
                    </p>
                  </div>
                </div>
                <Flame className="w-5 h-5 text-rose-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      کانون آسیب / بحران متناظر (تب بحران‌ها و آسیب‌ها)
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedCrisis && selectedCrisisId !== smartInference.suggestedCrisisId && (
                      <button
                        type="button"
                        onClick={() => setSelectedCrisisId(smartInference.suggestedCrisisId)}
                        className="inline-flex items-center gap-1 text-[10px] text-rose-700 hover:text-rose-900 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-rose-600" />
                        <span>پیشنهاد: {smartInference.suggestedCrisis.title.slice(0, 24)}...</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedCrisisId}
                    onChange={(e) => setSelectedCrisisId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  >
                    {crisesHarms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} (شدت: {c.severityScore}٪ | جمعیت درگیر: {formatNumber(c.affectedPopulation)})
                      </option>
                    ))}
                  </select>
                  {selectedCrisis && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">علت ریشه‌ای:</span> {selectedCrisis.primaryCause}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      اولویت توسعه و حوزه مداخله (تب اولویت‌ها و ضرایب)
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedPriority && selectedPriorityId !== smartInference.suggestedPriorityId && (
                      <button
                        type="button"
                        onClick={() => setSelectedPriorityId(smartInference.suggestedPriorityId)}
                        className="inline-flex items-center gap-1 text-[10px] text-purple-700 hover:text-purple-900 font-bold bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                        <span>پیشنهاد: {smartInference.suggestedPriority.category}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedPriorityId}
                    onChange={(e) => setSelectedPriorityId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  >
                    {priorities.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (سهم مصوب: {p.currentPercentage}٪)
                      </option>
                    ))}
                  </select>
                  {selectedPriority && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">دسته استراتژیک:</span> {selectedPriority.category}
                    </div>
                  )}

                  {/* Contextual Demographic Priority Quick Suggestions */}
                  {demographicPrioritySuggestions.length > 0 && (
                    <div className="mt-3 p-2.5 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>اولویت‌های پیشنهادی دموگرافیک برای {district.split(' ')[1] || district}:</span>
                        </span>
                        <span className="text-[10px] text-purple-600 font-normal">کلیک جهت اعمال آنی</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {demographicPrioritySuggestions.map((prop) => (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() => handleApplyDemographicPriority(prop)}
                            className="text-[11px] px-2 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 font-medium shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                            title={`برآورد: ${formatToman(prop.estimatedCostToman)} | ذینفعان: ${formatNumber(prop.beneficiariesCount)} نفر`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            <span className="font-semibold">{prop.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">درجه فوریت مداخله</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { level: 'CRITICAL', label: 'بحرانی و آنی', bg: 'bg-rose-50 text-rose-700 border-rose-300' },
                    { level: 'HIGH', label: 'اولویت بالا', bg: 'bg-amber-50 text-amber-700 border-amber-300' },
                    { level: 'MEDIUM', label: 'متوسط', bg: 'bg-blue-50 text-blue-700 border-blue-300' },
                    { level: 'LOW', label: 'عادی و تکمیلی', bg: 'bg-slate-50 text-slate-700 border-slate-300' },
                  ].map((item) => (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setUrgency(item.level as UrgencyLevel)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        urgency === item.level ? `${item.bg} ring-2 ring-blue-500/40 shadow-sm` : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4: Multi-Source Budgeting (CSR vs Government vs Dehyari vs Facilities) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    ۴
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">مدل ترکیبی تأمین مالی و بودجه چندمنبعی</h2>
                    <p className="text-xs text-slate-500">
                      تفکیک سهم مسئولیت اجتماعی شرکت‌ها (CSR)، بودجه عمومی دولت، عوارض آلایندگی دهیاری‌ها و تسهیلات
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoBalanceShares}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    تراز خودکار سهم‌ها
                  </button>
                  <Wallet className="w-5 h-5 text-emerald-500" />
                </div>
              </div>

              {/* Total Cost & Annual Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      برآورد کل هزینه طرح (تومان) <span className="text-rose-500">*</span>
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedCostToman && estimatedCostToman !== smartInference.suggestedCostToman && (
                      <button
                        type="button"
                        onClick={() => {
                          setEstimatedCostToman(smartInference.suggestedCostToman);
                          setCurrentYearAllocatedToman(Math.round(smartInference.suggestedCostToman * 0.6));
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        <span>پیشنهاد: {formatToman(smartInference.suggestedCostToman)}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step={10_000_000_000}
                    value={estimatedCostToman}
                    onChange={(e) => setEstimatedCostToman(Number(e.target.value))}
                    className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                    {formatToman(estimatedCostToman)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تخصیص مصوب سال جاری (تومان)</label>
                  <input
                    type="number"
                    step={10_000_000_000}
                    value={currentYearAllocatedToman}
                    onChange={(e) => setCurrentYearAllocatedToman(Number(e.target.value))}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {formatToman(currentYearAllocatedToman)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سرفصل اصلی منبع اعتباری</label>
                  <select
                    value={primaryBudgetSourceId}
                    onChange={(e) => setPrimaryBudgetSourceId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3 py-2"
                  >
                    {budgetSources.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.sourceTypeFa})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Source Shares Sliders & Balance Validation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">
                      تسهیم منابع اعتباری (مجموع باید دقیقاً ۱۰۰٪ باشد):
                    </span>
                    {smartInference.hasSignal && smartInference.suggestedBudget && (
                      <button
                        type="button"
                        onClick={() => {
                          setCsrSharePct(smartInference.suggestedBudget.csr);
                          setGovSharePct(smartInference.suggestedBudget.gov);
                          setDehyariSharePct(smartInference.suggestedBudget.dehyari);
                          setBankSharePct(smartInference.suggestedBudget.bank);
                          setCharitySharePct(smartInference.suggestedBudget.charity);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-800 hover:text-emerald-950 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                        title="اعمال درصد‌های استاندارد این دسته از طرح‌ها"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                        <span>الگوی بهینه: {smartInference.suggestedBudget.label}</span>
                      </button>
                    )}
                  </div>
                  <div
                    className={`text-xs font-black px-3 py-1 rounded-full border ${
                      isBudgetShareValid
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                    }`}
                  >
                    مجموع سهم‌ها: {totalBudgetShares}٪ {isBudgetShareValid ? '✓ (متوازن)' : '✗ (نیاز به اصلاح)'}
                  </div>
                </div>

                {/* Stacked Visual Bar */}
                <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                  <div style={{ width: `${csrSharePct}%` }} className="bg-emerald-500 transition-all duration-300" title={`مسئولیت اجتماعی: ${csrSharePct}%`} />
                  <div style={{ width: `${govSharePct}%` }} className="bg-blue-500 transition-all duration-300" title={`اعتبارات دولت: ${govSharePct}%`} />
                  <div style={{ width: `${dehyariSharePct}%` }} className="bg-amber-500 transition-all duration-300" title={`عوارض آلایندگی/دهیاری: ${dehyariSharePct}%`} />
                  <div style={{ width: `${bankSharePct}%` }} className="bg-purple-500 transition-all duration-300" title={`تسهیلات بانکی: ${bankSharePct}%`} />
                  <div style={{ width: `${charitySharePct}%` }} className="bg-rose-500 transition-all duration-300" title={`خیرین: ${charitySharePct}%`} />
                </div>

                {/* Shares Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1">
                      <span>سهم CSR مس</span>
                      <span>{csrSharePct}٪</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={csrSharePct}
                      onChange={(e) => setCsrSharePct(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                      {formatToman(Math.round((estimatedCostToman * csrSharePct) / 100))}
                    </div>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1">
                      <span>سهم دولت</span>
                      <span>{govSharePct}٪</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={govSharePct}
                      onChange={(e) => setGovSharePct(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-blue-700 font-semibold mt-1">
                      {formatToman(Math.round((estimatedCostToman * govSharePct) / 100))}
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-1">
                      <span>دهیاری / عوارض</span>
                      <span>{dehyariSharePct}٪</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={dehyariSharePct}
                      onChange={(e) => setDehyariSharePct(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-amber-700 font-semibold mt-1">
                      {formatToman(Math.round((estimatedCostToman * dehyariSharePct) / 100))}
                    </div>
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
                      <span>وام / تبصره ۲</span>
                      <span>{bankSharePct}٪</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bankSharePct}
                      onChange={(e) => setBankSharePct(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-purple-700 font-semibold mt-1">
                      {formatToman(Math.round((estimatedCostToman * bankSharePct) / 100))}
                    </div>
                  </div>

                  <div className="bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-900 mb-1">
                      <span>خیرین / مردمی</span>
                      <span>{charitySharePct}٪</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={charitySharePct}
                      onChange={(e) => setCharitySharePct(Number(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                    <div className="text-[10px] text-rose-700 font-semibold mt-1">
                      {formatToman(Math.round((estimatedCostToman * charitySharePct) / 100))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 5: Demographics, Beneficiaries & Geography */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-sm">
                    ۵
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">موقعیت مکانی، افراد بهره‌بردار و جامعه هدف</h2>
                    <p className="text-xs text-slate-500">
                      پیوند با تب جمعیت: تعیین بخش جغرافیایی، تعداد ذینفعان مستقیم و اقشار آسیب‌پذیر برخوردار
                    </p>
                  </div>
                </div>
                <Users className="w-5 h-5 text-cyan-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">بخش هدف در رفسنجان</label>
                    {smartInference.hasSignal && smartInference.inferredDistrict && district !== smartInference.inferredDistrict && (
                      <button
                        type="button"
                        onClick={() => setDistrict(smartInference.inferredDistrict)}
                        className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                        <span>پیشنهاد عنوان: {smartInference.inferredDistrict.split(' ')[1] || ''}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  >
                    <option value="بخش مرکزی و شهر رفسنجان">بخش مرکزی و شهر رفسنجان (۲۲۲هزار نفر)</option>
                    <option value="بخش کشکوئیه و دهستان راویز">بخش کشکوئیه و دهستان راویز (۴۱هزار نفر)</option>
                    <option value="بخش نوق و شهر بهرمان">بخش نوق و شهر بهرمان (۲۹هزار نفر)</option>
                    <option value="بخش فردوس و شهر صفائیه">بخش فردوس و شهر صفائیه (۲۳هزار نفر)</option>
                    <option value="کل شهرستان رفسنجان">کل شهرستان رفسنجان (۳۱۵هزار نفر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">محدوده یا نقطه اجرایی دقیق</label>
                  <input
                    type="text"
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value)}
                    placeholder="مثال: دهستان راویز، روستاهای خنامان، بیمارستان علی‌ابن‌ابیطالب"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      تعداد افراد استفاده‌کننده مستقیم <span className="text-rose-500">*</span>
                    </label>
                    {smartInference.hasSignal && beneficiariesCount !== smartInference.suggestedBeneficiaries && (
                      <button
                        type="button"
                        onClick={() => setBeneficiariesCount(smartInference.suggestedBeneficiaries)}
                        className="inline-flex items-center gap-1 text-[10px] text-cyan-800 hover:text-cyan-950 font-bold bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                        title="اعمال برآورد هوشمند جمعیت ذینفع این منطقه"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                        <span>پیشنهاد هوشمند: {formatNumber(smartInference.suggestedBeneficiaries)}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={beneficiariesCount}
                    onChange={(e) => setBeneficiariesCount(Number(e.target.value))}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                  />
                  {smartInference.hasSignal && smartInference.suggestedBeneficiariesReason && (
                    <div className="text-[10px] text-cyan-800 bg-cyan-50/70 border border-cyan-100 rounded-lg px-2 py-1 mt-1.5 flex items-center justify-between">
                      <span className="truncate">تحلیل: {smartInference.suggestedBeneficiariesReason}</span>
                      <button
                        type="button"
                        onClick={() => setBeneficiariesCount(smartInference.suggestedBeneficiaries)}
                        className="text-cyan-900 font-bold hover:underline shrink-0 mr-1 cursor-pointer"
                      >
                        اعمال
                      </button>
                    </div>
                  )}
                  {/* Demographic Quick Chips */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">گزینه‌ها:</span>
                    <button
                      type="button"
                      onClick={() => setBeneficiariesCount(smartInference.suggestedBeneficiaries)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold border border-cyan-200 transition-colors cursor-pointer"
                      title="جمعیت هدف محاسبه‌شده بر اساس نوع و مکان طرح"
                    >
                      پیشنهاد طرح ({formatNumber(smartInference.suggestedBeneficiaries)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBeneficiariesCount(smartInference.districtTotalPop)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
                      title="کل جمعیت ثبت‌شده این بخش در رفسنجان"
                    >
                      کل بخش ({formatNumber(smartInference.districtTotalPop)})
                    </button>
                    {smartInference.districtVulnerablePop > 0 && (
                      <button
                        type="button"
                        onClick={() => setBeneficiariesCount(smartInference.districtVulnerablePop)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium border border-amber-200 transition-colors cursor-pointer"
                        title="جمعیت اقشار آسیب‌پذیر و مددجویان این بخش"
                      >
                        آسیب‌پذیر ({formatNumber(smartInference.districtVulnerablePop)})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100">
                    <span>هزینه سرانه هر نفر:</span>
                    <span className="font-bold text-blue-700">{formatToman(costPerBeneficiary)}</span>
                  </div>
                </div>
              </div>

              {/* Target Beneficiary Groups Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700">
                    اقشار و گروه‌های هدف تحت پوشش طرح (از آمار جمعیتی رفسنجان):
                  </label>
                  {smartInference.hasSignal && smartInference.suggestedGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBeneficiaryGroups(smartInference.suggestedGroups)}
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-800 hover:text-cyan-950 font-bold bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                      <span>اعمال جامعه هدف مرتبط با این طرح</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  {BENEFICIARY_OPTIONS.map((opt) => {
                    const isChecked = selectedBeneficiaryGroups.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => handleToggleBeneficiaryGroup(opt)}
                        className={`p-2.5 rounded-xl text-right text-xs font-medium border transition-all flex items-start gap-2 ${
                          isChecked
                            ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-cyan-600 text-white' : 'border border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 6: Execution & Contracting Partner */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                    ۶
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">تعیین دستگاه مجری و پیمانکار واجد صلاحیت</h2>
                    <p className="text-xs text-slate-500">
                      اتصال به تب مجریان طرح و پیمانکاران دارای رتبه‌بندی تاییدشده در شهرستان
                    </p>
                  </div>
                </div>
                <HardHat className="w-5 h-5 text-amber-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      دستگاه مجری عملیات طرح (تب مجریان) <span className="text-rose-500">*</span>
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedExecutor && executorId !== smartInference.suggestedExecutorId && (
                      <button
                        type="button"
                        onClick={() => setExecutorId(smartInference.suggestedExecutorId)}
                        className="inline-flex items-center gap-1 text-[10px] text-amber-800 hover:text-amber-950 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        <span>پیشنهاد: {smartInference.suggestedExecutor.name.split(' ')[0]} {smartInference.suggestedExecutor.name.split(' ')[1] || ''}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={executorId}
                    onChange={(e) => setExecutorId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {executors.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.typeFa} | نرخ موفقیت: {ex.successRate}٪)
                      </option>
                    ))}
                  </select>
                  {selectedExecutor && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      مدیرمسئول: {selectedExecutor.managingDirector} | تماس: {selectedExecutor.contactPhone}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      پیمانکار اجرایی ذیصلاح (تب پیمانکاران)
                    </label>
                    {smartInference.hasSignal && smartInference.suggestedContractor && contractorId !== smartInference.suggestedContractorId && (
                      <button
                        type="button"
                        onClick={() => setContractorId(smartInference.suggestedContractorId)}
                        className="inline-flex items-center gap-1 text-[10px] text-amber-800 hover:text-amber-950 font-bold bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                        <span>پیشنهاد: {smartInference.suggestedContractor.companyName}</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={contractorId}
                    onChange={(e) => setContractorId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">بدون پیمانکار اختصاصی (امانی / توسط خود دستگاه مجری)</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.gradeFa} - {c.specialtyField})
                      </option>
                    ))}
                  </select>
                  {selectedContractor && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      مدیرعامل: {selectedContractor.ceoName} | امتیاز عملکرد: {selectedContractor.performanceScore} از ۱۰۰
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="text-xs font-semibold text-slate-400">اعتبارسنجی نهایی و ثبت در تمام ماژول‌ها</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  ارزش کل طرح: {formatToman(estimatedCostToman)} | بهره‌برداران: {formatNumber(beneficiariesCount)} نفر
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  انصراف و پاکسازی فرم
                </button>
                <button
                  type="submit"
                  disabled={!isBudgetShareValid}
                  className={`w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isBudgetShareValid
                      ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  ثبت نهایی و انتشار در کلیه تب‌ها
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live Project Passport Column (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Anti-Overlap Intelligence Card */}
          <div
            className={`rounded-2xl p-5 border shadow-sm transition-all ${
              potentialDuplicates.length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {potentialDuplicates.length > 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <h3 className="text-xs font-black text-amber-900">هشدار هوشمند ردیاب موازی‌کاری</h3>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h3 className="text-xs font-black text-emerald-900">سنجش موازی‌کاری: وضعیت بدون تداخل</h3>
                </>
              )}
            </div>

            {potentialDuplicates.length > 0 ? (
              <div className="text-xs space-y-2">
                <p className="text-amber-800 leading-relaxed">
                  سیستم متوجه شد طرح دیگری با بحران یا موقعیت مکانی مشابه در حال پیگیری است:
                </p>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-slate-800">
                  <div className="font-bold text-[11px] text-slate-900">{potentialDuplicates[0].title}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    متولی: {potentialDuplicates[0].departmentName} | کد: {potentialDuplicates[0].code}
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 font-semibold">
                  توصیه هوشمند: پیشنهاد می‌شود سهم‌های هر دو دستگاه را در قالب این پروژه مشترک ادغام نمایید تا از هدررفت بودجه جلوگیری شود.
                </p>
              </div>
            ) : (
              <p className="text-xs text-emerald-700 leading-relaxed">
                هیچ همپوشانی مخربی برای این محدوده و این سرفصل بحران با پروژه‌های دستگاه‌های دیگر ثبت نشده است. پروژه از حیث بهره‌وری قابل تایید است.
              </p>
            )}
          </div>

          {/* Live Passport Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                <span>پیش‌نمایش زنده شناسنامه پروژه</span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-indigo-200">{code}</span>
              </div>
              <h3 className="text-sm font-black leading-snug line-clamp-2">
                {title.trim() || 'عنوان پروژه پس از درج در فرم نمایش داده می‌شود'}
              </h3>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Core Attributes */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">دستگاه متولی اصلی:</span>
                  <span className="font-bold text-slate-800 text-left">{primaryDept?.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">اداره متقاضی:</span>
                  <span className="font-medium text-slate-700 text-left">{requestingDept?.name || '-'}</span>
                </div>
                {isMultiDept && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">مشارکت بین‌دستگاهی:</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {contributingDepts.length} اداره همکار
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">اولویت استراتژیک:</span>
                  <span className="font-medium text-purple-700 text-left line-clamp-1 max-w-[180px]">
                    {selectedPriority?.title || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">کانون بحران:</span>
                  <span className="font-medium text-rose-700 text-left line-clamp-1 max-w-[180px]">
                    {selectedCrisis?.title || '-'}
                  </span>
                </div>
              </div>

              {/* Budget Composition Breakdown */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">برآورد کل بودجه:</span>
                  <span className="font-black text-slate-900 text-sm">{formatToman(estimatedCostToman)}</span>
                </div>
                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span>سهم مسئولیت اجتماعی (CSR مس):</span>
                    <span className="font-bold">{csrSharePct}٪</span>
                  </div>
                  <div className="flex items-center justify-between text-blue-800">
                    <span>سهم بودجه دولتی:</span>
                    <span className="font-bold">{govSharePct}٪</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-800">
                    <span>سهم دهیاری / عوارض آلایندگی:</span>
                    <span className="font-bold">{dehyariSharePct}٪</span>
                  </div>
                  {bankSharePct > 0 && (
                    <div className="flex items-center justify-between text-purple-800">
                      <span>تسهیلات بانکی و تبصره ۲:</span>
                      <span className="font-bold">{bankSharePct}٪</span>
                    </div>
                  )}
                  {charitySharePct > 0 && (
                    <div className="flex items-center justify-between text-rose-800">
                      <span>مشارکت خیرین:</span>
                      <span className="font-bold">{charitySharePct}٪</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Demographics & Per Capita */}
              <div className="space-y-2 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">محدوده مکانی:</span>
                  <span className="font-semibold text-slate-800">{district}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">جمعیت بهره‌بردار مستقیم:</span>
                  <span className="font-bold text-slate-800">{formatNumber(beneficiariesCount)} نفر</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">هزینه سرانه هر نفر:</span>
                  <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {formatToman(costPerBeneficiary)}
                  </span>
                </div>
              </div>

              {/* Implementation Partner */}
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">دستگاه مجری:</span>
                  <span className="font-semibold text-slate-800">{selectedExecutor?.name || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">پیمانکار ذیصلاح:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedContractor?.companyName || 'امانی'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Projects Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              پروژه‌های ثبت‌شده در سامانه و ارتباط متقابل با تب‌ها ({projects.length} پروژه)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              جدول زیر ارتباط هر طرح را با دستگاه متقاضی، سهم منابع بودجه و جامعه هدف مستند نشان می‌دهد.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('PROJECTS')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
          >
            مشاهده کامل در رصد پروژه‌ها
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-3 font-bold">کد و عنوان پروژه</th>
                <th className="p-3 font-bold">دستگاه متولی و متقاضی</th>
                <th className="p-3 font-bold">سهم منابع مالی</th>
                <th className="p-3 font-bold">محدوده و بهره‌برداران</th>
                <th className="p-3 font-bold">کل برآورد</th>
                <th className="p-3 font-bold">سرانه هر نفر</th>
                <th className="p-3 font-bold">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.slice(0, 6).map((proj) => (
                <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{proj.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{proj.code}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-slate-800">{proj.departmentName}</div>
                    {proj.isMultiDepartment && (
                      <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        مشترک بین‌دستگاهی
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-emerald-700 font-bold">CSR: {proj.csrSharePercentage || 0}٪</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-blue-700 font-bold">دولت: {proj.governmentSharePercentage || 0}٪</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-slate-800 font-medium">{proj.district}</div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      {formatNumber(proj.beneficiariesCount)} نفر
                    </div>
                  </td>
                  <td className="p-3 font-bold text-slate-900">
                    {formatToman(proj.estimatedCostToman)}
                  </td>
                  <td className="p-3 font-bold text-blue-700">
                    {formatToman(proj.costPerBeneficiaryToman)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${
                        proj.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : proj.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {proj.status === 'COMPLETED'
                        ? 'تکمیل‌شده'
                        : proj.status === 'IN_PROGRESS'
                        ? 'در حال اجرا'
                        : 'پیشنهادی/مصوب'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
