import {
  AuditLogItem,
  BudgetSource,
  Contractor,
  CrisisHarmItem,
  Department,
  ExecutiveProject,
  LocationData,
  ProjectExecutor,
  UserProfile,
} from '../types';
import { PRIORITY_TITLE_BY_ID } from './omidiyehData';

/**
 * ============================================================================
 * ژنراتور داده‌های وابسته هر شهرستان (County Dependent Data Generator)
 * ----------------------------------------------------------------------------
 * هدف: هیچ شهرستانی در سامانه با لیست خالی یا داده ثابت یک شهرستان دیگر
 * نمایش داده نشود. برای هر رکورد سطح شهرستان، مجموعه‌ای از ادارات، منابع
 * مالی، بحران‌ها، مجریان، پیمانکاران و پروژه‌ها بر پایه «داده واقعی همان
 * شهرستان» ساخته می‌شود:
 *   • نام شهرستان و مرکز آن از جدول رسمی تقسیمات کشوری (src/data/initialData)
 *   • جمعیت، نرخ فقر، بیکاری، محرومیت زیرساختی و ریسک محیط‌زیستی از
 *     شاخص‌های ثبت‌شده همان رکورد مکان
 *   • ماهیت اقتصادی شهرستان (نفتی، پتروشیمی، بندری، کشاورزی، کوهستانی/عشایری،
 *     تالابی، مرزی، کلان‌شهری، تاریخی) از پروفایل زیر
 * اعداد بودجه «برآورد تقریبی» و مقیاس‌پذیر با جمعیت است تا برای اولویت‌سنجی
 * و شبیه‌سازی تخصیص قابل استفاده باشد.
 * ============================================================================
 */

type SectorTag =
  | 'OIL'
  | 'PETCHEM'
  | 'PORT'
  | 'AGRI'
  | 'MOUNTAIN'
  | 'MARSH'
  | 'BORDER'
  | 'URBAN'
  | 'HERITAGE';

interface CountyProfile {
  sectors: SectorTag[];
  /** ویژگی شاخص شهرستان برای متن‌های تحلیلی */
  note: string;
}

/**
 * پروفایل واقعی شهرستان‌های خوزستان (ماهیت اقتصادی/جغرافیایی).
 * کلید = نام شهرستان بدون پیشوند «شهرستان».
 */
const COUNTY_PROFILES: Record<string, CountyProfile> = {
  آبادان: { sectors: ['PORT', 'PETCHEM', 'URBAN'], note: 'بندری و پالایشگاهی در حاشیه اروندرود' },
  آغاجاری: { sectors: ['OIL'], note: 'شهر نفتی وابسته به تأسیسات نفت و گاز' },
  اندیکا: { sectors: ['MOUNTAIN', 'BORDER'], note: 'کوهستانی و عشایری با پراکندگی آبادی‌ها' },
  اندیمشک: { sectors: ['AGRI', 'URBAN'], note: 'کشاورزی شمال استان در حوضه سد دز' },
  اهواز: { sectors: ['URBAN', 'PETCHEM'], note: 'کلان‌شهر مرکز استان در حاشیه رود کارون' },
  ایذه: { sectors: ['MOUNTAIN', 'AGRI'], note: 'کوهستانی با ظرفیت دامداری و گردشگری' },
  باغملک: { sectors: ['MOUNTAIN', 'AGRI'], note: 'اراضی کشاورزی و دامنه‌های زاگرس' },
  باوی: { sectors: ['AGRI', 'URBAN'], note: 'کشاورزی و حاشیه کلان‌شهر اهواز' },
  بستان: { sectors: ['AGRI', 'BORDER'], note: 'مرزی و کشاورزی در غرب استان' },
  بهبهان: { sectors: ['AGRI', 'OIL'], note: 'کشاورزی، سد مارون و صنایع جانبی نفت' },
  حمیدیه: { sectors: ['AGRI', 'BORDER'], note: 'کشاورزی آبی و اراضی مستعد غرب کارون' },
  خرمشهر: { sectors: ['PORT', 'BORDER'], note: 'بندری و مرزی در محل تلاقی کارون و اروندرود' },
  دزفول: { sectors: ['AGRI', 'URBAN'], note: 'کشاورزی، صنعتی و تاریخی شمال استان' },
  'دشت آزادگان': { sectors: ['AGRI', 'BORDER'], note: 'مرزی و کشاورزی با اقلیم بسیار گرم' },
  رامشیر: { sectors: ['AGRI', 'OIL'], note: 'کشاورزی و مجاورت با تأسیسات نفتی' },
  رامهرمز: { sectors: ['AGRI', 'OIL'], note: 'کشاورزی و میدان‌های نفتی پیرامون' },
  شادگان: { sectors: ['MARSH', 'AGRI'], note: 'تالابی و کشاورزی با تنش شدید آبی' },
  شوش: { sectors: ['HERITAGE', 'AGRI'], note: 'تاریخی و کشاورزی در دشت شوش' },
  شوشتر: { sectors: ['HERITAGE', 'AGRI'], note: 'تاریخی، آبی و کشاورزی' },
  کارون: { sectors: ['URBAN', 'AGRI'], note: 'حاشیه کلان‌شهر اهواز و اراضی کشاورزی' },
  لالی: { sectors: ['OIL', 'MOUNTAIN'], note: 'نفتی و کوهستانی' },
  ماهشهر: { sectors: ['PETCHEM', 'PORT'], note: 'قطب پتروشیمی و بندری کشور' },
  مسجدسلیمان: { sectors: ['OIL', 'MOUNTAIN', 'HERITAGE'], note: 'خاستگاه صنعت نفت ایران و کوهستانی' },
  هفتکل: { sectors: ['OIL', 'MOUNTAIN'], note: 'نفتی و کوهستانی با بافت فرسوده' },
  هندیجان: { sectors: ['PORT', 'OIL'], note: 'بندری–نفتی در ساحل خلیج فارس' },
  هویزه: { sectors: ['MARSH', 'BORDER'], note: 'مرزی و تالابی در غرب استان' },
};

const DEFAULT_PROFILE: CountyProfile = {
  sectors: ['AGRI'],
  note: 'کشاورزی و روستایی با نیاز به تکمیل زیرساخت پایه',
};

const stripCountyPrefix = (county: string) => county.replace(/^شهرستان\s*/, '').trim();

const profileFor = (county: string): CountyProfile =>
  COUNTY_PROFILES[stripCountyPrefix(county)] ?? DEFAULT_PROFILE;

const has = (profile: CountyProfile, tag: SectorTag) => profile.sectors.includes(tag);

/** شناسه عددی پایدار و یکتا برای کدگذاری اقلام هر شهرستان. */
const countyCode = (location: LocationData): string => {
  const digits = location.id.match(/\d+/)?.[0] ?? '00';
  return `L${digits}`;
};

/** مقیاس بودجه تقریبی بر پایه جمعیت واقعی شهرستان (تومان). */
const budgetScale = (population: number): number => {
  const raw = Math.max(population, 12000) * 4_500_000;
  return Math.min(Math.round(raw / 10_000_000_000) * 10_000_000_000, 6_000_000_000_000);
};

const round10b = (value: number) => Math.max(Math.round(value / 10_000_000_000) * 10_000_000_000, 10_000_000_000);

/** قالب‌بندی عدد بودجه به میلیارد تومان برای متن لاگ‌های نظارتی. */
const formatBillion = (toman: number) => Math.round(toman / 1_000_000_000).toLocaleString('fa-IR');

export interface CountyDataset {
  departments: Department[];
  budgetSources: BudgetSource[];
  crisesHarms: CrisisHarmItem[];
  executors: ProjectExecutor[];
  contractors: Contractor[];
  projects: ExecutiveProject[];
  users: UserProfile[];
  auditLogs: AuditLogItem[];
}

/**
 * ساخت کامل داده‌های وابسته یک شهرستان از روی رکورد مکان همان شهرستان.
 * خروجی کاملاً قطعی (deterministic) است تا seed چندباره، رکورد تکراری نسازد.
 */
export function buildCountyDataset(location: LocationData): CountyDataset {
  const county = location.county;
  const province = location.province;
  const short = stripCountyPrefix(county);
  const tag = countyCode(location);
  const profile = profileFor(county);
  const ind = location.indicators;
  const population = location.population;
  const budget = budgetScale(population);
  const phone = (suffix: string) => `۰۶۱-۳۲${suffix}`;

  /* ---------------------------- ادارات ---------------------------- */
  const departments: Department[] = [
    {
      id: `dept-${tag}-01`,
      name: `امور آب و فاضلاب ${county} (شرکت آب و فاضلاب خوزستان)`,
      code: `ABFA-${tag}-101`,
      category: 'INFRASTRUCTURE',
      categoryFa: 'زیرساخت و عمران',
      headPersonName: 'مدیر امور آب و فاضلاب شهرستان',
      contactNumber: phone('840110'),
      allocatedBudgetToman: round10b(budget * 0.2),
      absorbedBudgetToman: round10b(budget * 0.13),
      activeProjectsCount: 2,
      performanceScore: 82,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `تأمین و پایدارسازی آب شرب شهری و روستایی ${short}، اصلاح شبکه فرسوده و احداث مخازن ذخیره با توجه به تنش آبی منطقه (${profile.note})`,
    },
    {
      id: `dept-${tag}-02`,
      name: `شبکه بهداشت و درمان ${county}`,
      code: `MED-${tag}-102`,
      category: 'HEALTH',
      categoryFa: 'بهداشت و درمان',
      headPersonName: 'رئیس شبکه بهداشت و درمان شهرستان',
      contactNumber: phone('840120'),
      allocatedBudgetToman: round10b(budget * 0.18),
      absorbedBudgetToman: round10b(budget * 0.12),
      activeProjectsCount: 2,
      performanceScore: 86,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `ارتقای خدمات بیمارستانی و درمانی، تجهیز پایگاه‌های سلامت شهری و روستایی و پوشش خانه‌های بهداشت در سطح ${county} (کمبود شاخص دسترسی درمان ${ind.healthAccessDeficit.toFixed(0)} درصد)`,
    },
    {
      id: `dept-${tag}-03`,
      name: `اداره راهداری و حمل‌ونقل جاده‌ای ${county}`,
      code: `RAH-${tag}-103`,
      category: 'INFRASTRUCTURE',
      categoryFa: 'زیرساخت و عمران',
      headPersonName: 'رئیس اداره راهداری شهرستان',
      contactNumber: phone('840130'),
      allocatedBudgetToman: round10b(budget * 0.14),
      absorbedBudgetToman: round10b(budget * 0.09),
      activeProjectsCount: 2,
      performanceScore: 80,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `بهسازی محورهای مواصلاتی و راه‌های روستایی ${short}، ایمن‌سازی نقاط حادثه‌خیز و روشنایی معابر بین‌شهری (کمبود زیرساخت ${ind.infrastructureDeficit.toFixed(0)} درصد)`,
    },
    {
      id: `dept-${tag}-04`,
      name: `شهرداری‌ها و دهیاری‌های ${county}`,
      code: `MUN-${tag}-104`,
      category: 'MUNICIPAL_RURAL',
      categoryFa: 'خدمات شهری و روستایی',
      headPersonName: 'شهردار مرکز شهرستان و نماینده دهیاری‌ها',
      contactNumber: phone('840140'),
      allocatedBudgetToman: round10b(budget * 0.16),
      absorbedBudgetToman: round10b(budget * 0.1),
      activeProjectsCount: 3,
      performanceScore: 79,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `بهسازی معابر، جدول‌گذاری، روشنایی و مدیریت پسماند شهرها و روستاهای ${county} و ساماندهی محلات کم‌برخودار (حاشیه‌نشینی ${ind.marginalizationRate.toFixed(1)} درصد)`,
    },
    {
      id: `dept-${tag}-05`,
      name: `اداره حفاظت محیط زیست ${county}`,
      code: `ENV-${tag}-105`,
      category: 'ENVIRONMENT',
      categoryFa: 'محیط زیست',
      headPersonName: 'رئیس اداره حفاظت محیط زیست شهرستان',
      contactNumber: phone('840150'),
      allocatedBudgetToman: round10b(budget * 0.11),
      absorbedBudgetToman: round10b(budget * 0.07),
      activeProjectsCount: 2,
      performanceScore: 81,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `پایش آلودگی هوا و ریزگرد، مهار آلاینده‌های صنعتی و پساب، تثبیت کانون‌های گردوغبار و نظارت زیست‌محیطی در ${short} (ریسک محیط‌زیستی ${ind.environmentalRiskScore.toFixed(0)} از ۱۰۰)`,
    },
    {
      id: `dept-${tag}-06`,
      name: `اداره آموزش و پرورش ${county}`,
      code: `EDU-${tag}-106`,
      category: 'EDUCATION',
      categoryFa: 'آموزش و پرورش',
      headPersonName: 'مدیر آموزش و پرورش شهرستان',
      contactNumber: phone('840160'),
      allocatedBudgetToman: round10b(budget * 0.12),
      absorbedBudgetToman: round10b(budget * 0.08),
      activeProjectsCount: 2,
      performanceScore: 84,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `نوسازی و مقاوم‌سازی مدارس روستایی و شهری ${county}، تجهیز هنرستان‌ها و کاهش نرخ ترک تحصیل (نرخ فعلی ${ind.educationDropOutRate.toFixed(1)} درصد)`,
    },
  ];

  if (has(profile, 'OIL')) {
    departments.push({
      id: `dept-${tag}-07`,
      name: `شرکت بهره‌برداری نفت و گاز منطقه ${short} (مسئولیت اجتماعی)`,
      code: `NISOC-${tag}-107`,
      category: 'INFRASTRUCTURE',
      categoryFa: 'صنعت نفت و مسئولیت اجتماعی',
      headPersonName: 'مدیر مسئولیت‌های اجتماعی منطقه نفتی',
      contactNumber: phone('840170'),
      allocatedBudgetToman: round10b(budget * 0.3),
      absorbedBudgetToman: round10b(budget * 0.2),
      activeProjectsCount: 3,
      performanceScore: 88,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `اجرای طرح‌های عام‌المنفعه مسئولیت اجتماعی صنعت نفت در ${county}؛ آبرسانی، راه، مدرسه‌سازی، اشتغال بومی و جبران آلایندگی‌های صنعتی`,
    });
  }

  if (has(profile, 'PETCHEM')) {
    departments.push({
      id: `dept-${tag}-08`,
      name: `اداره کل حفاظت محیط زیست و پایش صنایع پتروشیمی ${short}`,
      code: `PET-${tag}-108`,
      category: 'ENVIRONMENT',
      categoryFa: 'محیط زیست و پایش صنعتی',
      headPersonName: 'سرپرست پایش آلایندگی‌های صنعتی',
      contactNumber: phone('840180'),
      allocatedBudgetToman: round10b(budget * 0.22),
      absorbedBudgetToman: round10b(budget * 0.14),
      activeProjectsCount: 2,
      performanceScore: 83,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `پایش برخط خروجی صنایع، کاهش فلرینگ و آلاینده‌های صنعتی، پایش خاک و آب و اجرای طرح‌های کاهش ردپای کربن در ${short}`,
    });
  }

  if (has(profile, 'PORT')) {
    departments.push({
      id: `dept-${tag}-09`,
      name: `اداره بندر و دریانوردی ${short}`,
      code: `PRT-${tag}-109`,
      category: 'INFRASTRUCTURE',
      categoryFa: 'بندری و دریایی',
      headPersonName: 'مدیر بندر و دریانوردی منطقه',
      contactNumber: phone('840190'),
      allocatedBudgetToman: round10b(budget * 0.15),
      absorbedBudgetToman: round10b(budget * 0.1),
      activeProjectsCount: 2,
      performanceScore: 85,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `توسعه زیرساخت بندری، لایروبی، ایمنی دریایی و پشتیبانی از اقتصاد دریامحور ${short}`,
    });
  }

  if (has(profile, 'MOUNTAIN') || has(profile, 'BORDER')) {
    departments.push({
      id: `dept-${tag}-10`,
      name: `امور عشایر و توسعه روستایی ${county}`,
      code: `TRB-${tag}-110`,
      category: 'MUNICIPAL_RURAL',
      categoryFa: 'توسعه روستایی و عشایری',
      headPersonName: 'مدیر امور عشایر و روستاهای شهرستان',
      contactNumber: phone('840200'),
      allocatedBudgetToman: round10b(budget * 0.13),
      absorbedBudgetToman: round10b(budget * 0.08),
      activeProjectsCount: 2,
      performanceScore: 78,
      administrativeLevel: 'COUNTY',
      province,
      county,
      description: `آبرسانی سیار و پایدار به آبادی‌های پراکنده، راه‌های دسترسی روستایی، برق‌رسانی و حمایت از معیشت عشایری در ${short}`,
    });
  }

  /* ---------------------------- منابع مالی ---------------------------- */
  const sponsor = has(profile, 'OIL')
    ? `شرکت بهره‌برداری نفت و گاز منطقه ${short} و شرکت ملی مناطق نفت‌خیز جنوب`
    : has(profile, 'PETCHEM')
      ? `مجتمع‌های پتروشیمی منطقه ویژه ${short}`
      : has(profile, 'PORT')
        ? `سازمان بنادر و دریانوردی و شرکت‌های بندری ${short}`
        : `صنایع، معادن و شرکت‌های فعال در ${county}`;

  const budgetSources: BudgetSource[] = [
    {
      id: `src-${tag}-01`,
      title: `اعتبارات مسئولیت اجتماعی صنایع منطقه ${short}`,
      code: `SRC-${tag}-CSR-01`,
      sourceType: 'CSR',
      sourceTypeFa: 'مسئولیت اجتماعی (CSR)',
      totalAmountToman: round10b(budget * 0.35),
      allocatedAmountToman: round10b(budget * 0.25),
      remainingAmountToman: round10b(budget * 0.1),
      fiscalYear: '۱۴۰۳-۱۴۰۴',
      sponsorOrganization: sponsor,
      targetScope: `طرح‌های عام‌المنفعه، بهداشتی، آموزشی و توانمندسازی در ${county}`,
      restrictionNote: 'مطابق ضوابط مسئولیت اجتماعی صنایع، صرفاً طرح‌های بومی و عام‌المنفعه',
      status: 'ACTIVE',
      province,
      county,
    },
    {
      id: `src-${tag}-02`,
      title: `اعتبارات تملک دارایی‌های سرمایه‌ای استان ${province} (عمرانی استانی)`,
      code: `SRC-${tag}-GOV-02`,
      sourceType: 'GOVERNMENT',
      sourceTypeFa: 'اعتبارات دولتی و عمرانی',
      totalAmountToman: round10b(budget * 0.3),
      allocatedAmountToman: round10b(budget * 0.22),
      remainingAmountToman: round10b(budget * 0.08),
      fiscalYear: '۱۴۰۳-۱۴۰۴',
      sponsorOrganization: `سازمان مدیریت و برنامه‌ریزی استان ${province} / فرمانداری ${short}`,
      targetScope: 'طرح‌های راه، آب شرب، بهداشت، نوسازی مدارس و عمران روستایی',
      restrictionNote: 'تخصیص از محل منابع استانی و اسناد خزانه اسلامی طبق قانون بودجه',
      status: 'ACTIVE',
      province,
      county,
    },
    {
      id: `src-${tag}-03`,
      title: `عوارض آلایندگی، ارزش افزوده و اعتبارات شهرداری و دهیاری‌های ${county}`,
      code: `SRC-${tag}-MUN-03`,
      sourceType: 'DEHYARI_MUNICIPALITY',
      sourceTypeFa: 'اعتبارات دهیاری‌ها و شهرداری‌ها',
      totalAmountToman: round10b(budget * 0.2),
      allocatedAmountToman: round10b(budget * 0.14),
      remainingAmountToman: round10b(budget * 0.06),
      fiscalYear: '۱۴۰۳-۱۴۰۴',
      sponsorOrganization: `شهرداری‌ها و دهیاری‌های ${county} / استانداری ${province}`,
      targetScope: 'بهسازی معابر، روشنایی، جدول‌گذاری، فضای سبز و مدیریت پسماند',
      status: 'ACTIVE',
      province,
      county,
    },
    {
      id: `src-${tag}-04`,
      title: 'بنیادهای حمایتی و محرومیت‌زدایی (بنیاد برکت و بنیاد علوی)',
      code: `SRC-${tag}-CHR-04`,
      sourceType: 'CHARITY_FOUNDATION',
      sourceTypeFa: 'خیریه‌ها و بنیادهای حمایتی',
      totalAmountToman: round10b(budget * 0.12),
      allocatedAmountToman: round10b(budget * 0.08),
      remainingAmountToman: round10b(budget * 0.04),
      fiscalYear: '۱۴۰۳-۱۴۰۴',
      sponsorOrganization: 'بنیاد برکت / بنیاد علوی / بنیاد مستضعفان',
      targetScope: `محرومیت‌زدایی، اشتغال خرد، مسکن محرومان و مدرسه‌سازی در روستاهای ${short}`,
      status: 'ACTIVE',
      province,
      county,
    },
    {
      id: `src-${tag}-05`,
      title: 'تسهیلات تبصره ۲ قانون بودجه و صندوق کارآفرینی امید (اشتغال)',
      code: `SRC-${tag}-BNK-05`,
      sourceType: 'BANK_FACILITY',
      sourceTypeFa: 'تسهیلات بانکی و اشتغال',
      totalAmountToman: round10b(budget * 0.1),
      allocatedAmountToman: round10b(budget * 0.07),
      remainingAmountToman: round10b(budget * 0.03),
      fiscalYear: '۱۴۰۳-۱۴۰۴',
      sponsorOrganization: `صندوق کارآفرینی امید ${province} و بانک‌های عامل استان`,
      targetScope: 'وام‌های خوداشتغالی جوانان، زنان سرپرست خانوار و کسب‌وکارهای خرد روستایی',
      status: 'ACTIVE',
      province,
      county,
    },
    {
      id: `src-${tag}-06`,
      title: `مشارکت‌های مردمی، خیرین و موقوفات محلی ${county}`,
      code: `SRC-${tag}-PUB-06`,
      sourceType: 'PUBLIC_PARTICIPATION',
      sourceTypeFa: 'مشارکت مردمی و خیرین',
      totalAmountToman: round10b(budget * 0.08),
      allocatedAmountToman: round10b(budget * 0.05),
      remainingAmountToman: round10b(budget * 0.03),
      fiscalYear: '۱۴۰۳-۱۴۰۴',
      sponsorOrganization: `مجمع خیرین و شوراهای اسلامی محلات ${short}`,
      targetScope: 'تجهیز پایگاه‌های بهداشتی، کمک‌هزینه درمان و ساخت فضاهای آموزشی و ورزشی محله‌محور',
      status: 'ACTIVE',
      province,
      county,
    },
  ];

  /* ---------------------------- بحران‌ها ---------------------------- */
  const dustSeverity = Math.min(Math.round(ind.environmentalRiskScore + 10), 95);
  const waterSeverity = Math.min(Math.round(ind.infrastructureDeficit + 35), 94);
  const jobSeverity = Math.min(Math.round(ind.unemploymentRate * 3.5 + 10), 92);

  const crisesHarms: CrisisHarmItem[] = [
    {
      id: `crisis-${tag}-01`,
      title: 'ریزگردهای مکرر و شیوع بیماری‌های تنفسی',
      code: `CRS-${tag}-DUST-01`,
      category: 'محیط زیست و سلامت',
      level: 'COUNTY',
      province,
      county,
      districtOrVillage: `کل ${county}`,
      severityScore: dustSeverity,
      urgency: dustSeverity >= 80 ? 'CRITICAL' : 'HIGH',
      affectedPopulation: population,
      primaryCause: 'کانون‌های گردوغبار داخلی و برون‌مرزی، خشکیدگی اراضی و کاهش پوشش گیاهی',
      recommendedIntervention: 'تثبیت کانون‌های گردوغبار با مالچ‌پاشی زیستی، کاشت کمربند سبز، پایش برخط کیفیت هوا و تجهیز خدمات درمان تنفسی',
      status: 'UNDER_INTERVENTION',
      activeProjectsCount: 1,
      deficitIndexFa: 'ریزگرد حاد و کمبود خدمات درمان تنفسی',
    },
    {
      id: `crisis-${tag}-02`,
      title: 'تنش و کیفیت نامناسب آب شرب شهری و روستایی',
      code: `CRS-${tag}-WAT-02`,
      category: 'زیرساخت و آب شرب',
      level: 'COUNTY',
      province,
      county,
      districtOrVillage: `شهرهای ${short} و روستاهای تابعه`,
      severityScore: waterSeverity,
      urgency: waterSeverity >= 80 ? 'CRITICAL' : 'HIGH',
      affectedPopulation: Math.round(population * 0.45),
      primaryCause: 'فرسودگی شبکه انتقال، خشکسالی و شوری منابع آب، کمبود مخازن ذخیره',
      recommendedIntervention: 'احداث مخازن ذخیره، اصلاح خطوط انتقال، نصب سامانه‌های نمک‌زدایی و آبرسانی سیار تابستانه',
      status: 'UNDER_INTERVENTION',
      activeProjectsCount: 1,
      deficitIndexFa: 'تنش آب شرب و فرسودگی شبکه',
    },
    {
      id: `crisis-${tag}-03`,
      title: 'بیکاری جوانان و نبود تنوع اقتصادی',
      code: `CRS-${tag}-JOB-03`,
      category: 'اشتغال و معیشت',
      level: 'COUNTY',
      province,
      county,
      districtOrVillage: `شهرها و روستاهای ${county}`,
      severityScore: jobSeverity,
      urgency: jobSeverity >= 80 ? 'CRITICAL' : 'HIGH',
      affectedPopulation: Math.round(population * (ind.unemploymentRate / 100) * 1.8),
      primaryCause: `نرخ بیکاری ${ind.unemploymentRate.toFixed(1)} درصدی، وابستگی اقتصاد محلی و نبود صنایع تبدیلی`,
      recommendedIntervention: 'مهارت‌آموزی فنی‌وحرفه‌ای، تسهیلات اشتغال خرد، حمایت از صنایع تبدیلی و پیمانکاری بومی',
      status: 'UNDER_INTERVENTION',
      activeProjectsCount: 1,
      deficitIndexFa: 'بیکاری ساختاری و اقتصاد تک‌پایه',
    },
    {
      id: `crisis-${tag}-04`,
      title: has(profile, 'PETCHEM')
        ? 'آلودگی هوا و پساب صنایع پتروشیمی'
        : has(profile, 'OIL')
          ? 'آلودگی‌های نفتی خاک و آب'
          : has(profile, 'MARSH')
            ? 'خشکیدگی تالاب و شوری اراضی پیرامون'
            : has(profile, 'PORT')
              ? 'فرسودگی بافت بندری و خطر آبگرفتگی'
              : has(profile, 'MOUNTAIN')
                ? 'صعب‌العبور بودن راه‌های روستایی و پراکندگی آبادی‌ها'
                : has(profile, 'BORDER')
                  ? 'موانع توسعه مناطق مرزی و اشتغال مرزنشینان'
                  : has(profile, 'URBAN')
                    ? 'حاشیه‌نشینی و بافت فرسوده شهری'
                    : has(profile, 'HERITAGE')
                      ? 'فرسودگی بافت تاریخی و کاستی خدمات گردشگری'
                      : 'کمبود زیرساخت کشاورزی و آب کشاورزی',
      code: `CRS-${tag}-SEC-04`,
      category: 'ویژگی‌های بومی شهرستان',
      level: 'COUNTY',
      province,
      county,
      districtOrVillage: `محدوده شاخص ${county}`,
      severityScore: Math.min(Math.round((ind.crisisVulnerabilityScore + ind.environmentalRiskScore) / 2), 90),
      urgency: 'HIGH',
      affectedPopulation: Math.round(population * 0.3),
      primaryCause: profile.note,
      recommendedIntervention: has(profile, 'PETCHEM') || has(profile, 'OIL')
        ? 'الزام صنایع به کاهش آلایندگی، پایش برخط و پاکسازی نقاط آلوده'
        : has(profile, 'MARSH') || has(profile, 'PORT')
          ? 'طرح‌های احیا و حفاظت محیط‌زیستی، لایروبی و ایمن‌سازی زیرساخت‌ها'
          : has(profile, 'MOUNTAIN') || has(profile, 'BORDER')
            ? 'راه‌سازی روستایی، آبرسانی سیار و حمایت از معیشت پایدار'
            : 'تکمیل زیرساخت کشاورزی، تسهیلات کسب‌وکار و ساماندهی محلات کم‌برخودار',
      status: 'UNRESOLVED',
      activeProjectsCount: 1,
      deficitIndexFa: 'چالش شاخص توسعه شهرستان',
    },
    {
      id: `crisis-${tag}-05`,
      title: 'آسیب‌های اجتماعی، اعتیاد و سکونتگاه‌های کم‌برخوردار',
      code: `CRS-${tag}-SOC-05`,
      category: 'عدالت اجتماعی و سلامت روان',
      level: 'COUNTY',
      province,
      county,
      districtOrVillage: `محلات کم‌برخودار ${short}`,
      severityScore: Math.min(Math.round(ind.socialHarmsIndex + 8), 90),
      urgency: ind.socialHarmsIndex >= 50 ? 'HIGH' : 'MEDIUM',
      affectedPopulation: ind.vulnerableGroupsPopulation,
      primaryCause: `شاخص آسیب اجتماعی ${ind.socialHarmsIndex.toFixed(0)} از ۱۰۰ و حاشیه‌نشینی ${ind.marginalizationRate.toFixed(1)} درصد`,
      recommendedIntervention: 'تقویت اورژانس اجتماعی، مراکز مشاوره و درمان اعتیاد، حمایت معیشتی و برنامه‌های اشتغال بهبودیافتگان',
      status: 'UNDER_INTERVENTION',
      activeProjectsCount: 1,
      deficitIndexFa: 'آسیب اجتماعی و کمبود خدمات مددکاری',
    },
  ];

  /* ---------------------------- مجریان ---------------------------- */
  const executors: ProjectExecutor[] = [
    {
      id: `exec-${tag}-01`,
      name: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      code: `EX-${tag}-JIHAD-01`,
      type: 'JIHADI_FOUNDATION',
      typeFa: 'قرارگاه جهادی و محرومیت‌زدایی',
      managingDirector: 'فرمانده قرارگاه جهادی شهرستان',
      contactPhone: phone('841100'),
      activeProjectsCount: 3,
      completedProjectsCount: 21,
      successRate: 90,
      capacityStatus: 'OPTIMAL',
      coverageRegion: `ساخت مسکن محرومان، آبرسانی روستایی، مدرسه‌سازی و اردوهای جهادی در ${county}`,
      province,
      county,
    },
    {
      id: `exec-${tag}-02`,
      name: `امور آب و فاضلاب ${county} (آبفای ${province})`,
      code: `EX-${tag}-ABFA-02`,
      type: 'GOVERNMENTAL',
      typeFa: 'دستگاه اجرایی تخصصی دولتی',
      managingDirector: 'مدیر امور آب و فاضلاب شهرستان',
      contactPhone: phone('840110'),
      activeProjectsCount: 2,
      completedProjectsCount: 18,
      successRate: 87,
      capacityStatus: 'AVAILABLE',
      coverageRegion: `شبکه‌های آبرسانی، مخازن ذخیره و تصفیه‌خانه‌های ${county}`,
      province,
      county,
    },
    {
      id: `exec-${tag}-03`,
      name: `شبکه بهداشت و درمان ${county}`,
      code: `EX-${tag}-HLT-03`,
      type: 'GOVERNMENTAL',
      typeFa: 'دستگاه اجرایی تخصصی سلامت',
      managingDirector: 'رئیس شبکه بهداشت و درمان شهرستان',
      contactPhone: phone('840120'),
      activeProjectsCount: 2,
      completedProjectsCount: 15,
      successRate: 92,
      capacityStatus: 'AVAILABLE',
      coverageRegion: `بیمارستان، مراکز بهداشتی و خانه‌های بهداشت شهری و روستایی ${county}`,
      province,
      county,
    },
  ];

  if (has(profile, 'OIL') || has(profile, 'PETCHEM') || has(profile, 'PORT')) {
    executors.push({
      id: `exec-${tag}-04`,
      name: has(profile, 'PETCHEM') || has(profile, 'PORT')
        ? `شرکت عمران و توسعه صنایع منطقه ${short}`
        : `شرکت بهره‌برداری نفت و گاز منطقه ${short}`,
      code: `EX-${tag}-IND-04`,
      type: 'GOVERNMENTAL',
      typeFa: 'دستگاه اجرایی صنعتی',
      managingDirector: 'مدیر عامل شرکت صنعتی منطقه',
      contactPhone: phone('841200'),
      activeProjectsCount: 2,
      completedProjectsCount: 24,
      successRate: 89,
      capacityStatus: 'OPTIMAL',
      coverageRegion: `طرح‌های زیربنایی، اشتغال و رفاهی ${county} با تأمین اعتبار صنایع`,
      province,
      county,
    });
  }

  /* ---------------------------- پیمانکاران ---------------------------- */
  const contractors: Contractor[] = [
    {
      id: `cnt-${tag}-01`,
      companyName: `شرکت راه‌سازی و عمران ${short}`,
      ceoName: 'مدیرعامل شرکت پیمانکاری',
      nationalId: `103${tag.replace(/\D/g, '').padStart(2, '0')}445511`,
      grade: 'GRADE_2',
      gradeFa: 'پایه ۲ راه و ترابری',
      specialtyField: 'آسفالت راه‌های روستایی، ابنیه فنی و بهسازی محورهای مواصلاتی',
      activeContractsCount: 2,
      totalContractValueToman: round10b(budget * 0.2),
      performanceScore: 86,
      satisfactionRating: 4,
      freeCapacitySlots: 2,
      phone: phone('842100'),
      status: 'VERIFIED',
      province,
      county,
    },
    {
      id: `cnt-${tag}-02`,
      companyName: `شرکت مهندسی آب و تأسیسات ${short}`,
      ceoName: 'مدیرعامل شرکت مهندسی',
      nationalId: `103${tag.replace(/\D/g, '').padStart(2, '0')}556622`,
      grade: 'GRADE_2',
      gradeFa: 'پایه ۲ آب و فاضلاب',
      specialtyField: 'خطوط انتقال آب، مخازن بتنی، شبکه توزیع و تصفیه‌خانه',
      activeContractsCount: 2,
      totalContractValueToman: round10b(budget * 0.16),
      performanceScore: 88,
      satisfactionRating: 4,
      freeCapacitySlots: 3,
      phone: phone('842200'),
      status: 'VERIFIED',
      province,
      county,
    },
    {
      id: `cnt-${tag}-03`,
      companyName: `شرکت ابنیه، تجهیزات و ساختمان جنوب ${short}`,
      ceoName: 'مدیرعامل شرکت ساختمانی',
      nationalId: `103${tag.replace(/\D/g, '').padStart(2, '0')}667733`,
      grade: 'GRADE_3',
      gradeFa: 'پایه ۳ ابنیه و تأسیسات',
      specialtyField: 'ساخت و مقاوم‌سازی مدارس، مراکز بهداشتی و ساختمان‌های اداری',
      activeContractsCount: 1,
      totalContractValueToman: round10b(budget * 0.12),
      performanceScore: 84,
      satisfactionRating: 4,
      freeCapacitySlots: 3,
      phone: phone('842300'),
      status: 'VERIFIED',
      province,
      county,
    },
  ];

  /* ---------------------------- پروژه‌ها ---------------------------- */
  const beneficiaryShare = (ratio: number) => Math.max(Math.round(population * ratio), 120);
  const costOf = (ratio: number) => round10b(budget * ratio);

  const projects: ExecutiveProject[] = [
    {
      id: `proj-${tag}-01`,
      code: `PRJ-${tag}-WAT-01`,
      title: `آبرسانی پایدار و اصلاح شبکه آب شرب روستاهای دارای تنش آبی ${county}`,
      priorityId: 'p1',
      priorityTitle: PRIORITY_TITLE_BY_ID.p1,
      departmentId: `dept-${tag}-01`,
      departmentName: `امور آب و فاضلاب ${county} (شرکت آب و فاضلاب خوزستان)`,
      budgetSourceId: `src-${tag}-02`,
      budgetSourceName: `اعتبارات تملک دارایی‌های سرمایه‌ای استان ${province} (عمرانی استانی)`,
      executorId: `exec-${tag}-02`,
      executorName: `امور آب و فاضلاب ${county} (آبفای ${province})`,
      contractorId: `cnt-${tag}-02`,
      contractorName: `شرکت مهندسی آب و تأسیسات ${short}`,
      crisisHarmId: `crisis-${tag}-02`,
      crisisHarmTitle: 'تنش و کیفیت نامناسب آب شرب شهری و روستایی',
      urgencyLevel: 'HIGH',
      administrativeLevel: 'RURAL_DISTRICT',
      province,
      county,
      district: `روستاهای دارای تنش آبی ${county}`,
      targetArea: `روستاهای کم‌آب و فاقد مخزن ذخیره در ${county}`,
      estimatedCostToman: costOf(0.22),
      currentYearAllocatedToman: costOf(0.14),
      futureYearsAllocatedToman: costOf(0.08),
      csrSharePercentage: 40,
      governmentSharePercentage: 45,
      charitySharePercentage: 15,
      beneficiariesCount: beneficiaryShare(0.18),
      costPerBeneficiaryToman: Math.round(costOf(0.22) / beneficiaryShare(0.18)),
      targetBeneficiaryGroups: ['خانوارهای روستایی', 'کشاورزان و دامداران', 'زنان سرپرست خانوار'],
      antiOverlapStatus: 'CLEAR',
      status: 'IN_PROGRESS',
      startYear: 1403,
      endYear: 1404,
      durationMonths: 14,
      progressPercentage: 40,
      description: `حفر چاه پشتیبان، احداث مخزن بتنی ذخیره و اصلاح خطوط انتقال فرسوده برای پایدارسازی آب شرب روستاهای ${short} با اولویت مناطق دارای تنش بحرانی`,
    },
    {
      id: `proj-${tag}-02`,
      code: `PRJ-${tag}-ROD-02`,
      title: `ایمن‌سازی نقاط حادثه‌خیز و بهسازی راه‌های روستایی ${county}`,
      priorityId: 'p1',
      priorityTitle: PRIORITY_TITLE_BY_ID.p1,
      departmentId: `dept-${tag}-03`,
      departmentName: `اداره راهداری و حمل‌ونقل جاده‌ای ${county}`,
      budgetSourceId: `src-${tag}-02`,
      budgetSourceName: `اعتبارات تملک دارایی‌های سرمایه‌ای استان ${province} (عمرانی استانی)`,
      executorId: `exec-${tag}-01`,
      executorName: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      contractorId: `cnt-${tag}-01`,
      contractorName: `شرکت راه‌سازی و عمران ${short}`,
      urgencyLevel: 'HIGH',
      administrativeLevel: 'COUNTY',
      province,
      county,
      district: `محورهای اصلی و روستایی ${county}`,
      targetArea: `نقاط پرتصادف و راه‌های روستایی ${county}`,
      estimatedCostToman: costOf(0.2),
      currentYearAllocatedToman: costOf(0.13),
      futureYearsAllocatedToman: costOf(0.07),
      csrSharePercentage: 35,
      governmentSharePercentage: 65,
      beneficiariesCount: beneficiaryShare(0.25),
      costPerBeneficiaryToman: Math.round(costOf(0.2) / beneficiaryShare(0.25)),
      targetBeneficiaryGroups: ['ساکنان روستاهای مسیر', 'رانندگان و حمل‌ونقل عمومی', 'کشاورزان'],
      antiOverlapStatus: 'CLEAR',
      status: 'IN_PROGRESS',
      startYear: 1403,
      endYear: 1405,
      durationMonths: 18,
      progressPercentage: 35,
      description: `تعریض و روکش آسفالت راه‌های روستایی، نصب گاردریل و روشنایی نقاط پرحادثه و اصلاح تقاطع‌های دارای سابقه تصادف در ${short}`,
    },
    {
      id: `proj-${tag}-03`,
      code: `PRJ-${tag}-HLT-03`,
      title: `تجهیز و ارتقای خدمات درمانی بیمارستان و مراکز بهداشتی ${county}`,
      priorityId: 'p4',
      priorityTitle: PRIORITY_TITLE_BY_ID.p4,
      departmentId: `dept-${tag}-02`,
      departmentName: `شبکه بهداشت و درمان ${county}`,
      budgetSourceId: `src-${tag}-01`,
      budgetSourceName: `اعتبارات مسئولیت اجتماعی صنایع منطقه ${short}`,
      executorId: `exec-${tag}-03`,
      executorName: `شبکه بهداشت و درمان ${county}`,
      crisisHarmId: `crisis-${tag}-01`,
      crisisHarmTitle: 'ریزگردهای مکرر و شیوع بیماری‌های تنفسی',
      urgencyLevel: 'HIGH',
      administrativeLevel: 'COUNTY',
      province,
      county,
      district: `شهر مرکز و روستاهای ${county}`,
      targetArea: `بیمارستان و مراکز بهداشتی ${county}`,
      estimatedCostToman: costOf(0.18),
      currentYearAllocatedToman: costOf(0.18),
      csrSharePercentage: 70,
      governmentSharePercentage: 30,
      beneficiariesCount: beneficiaryShare(0.3),
      costPerBeneficiaryToman: Math.round(costOf(0.18) / beneficiaryShare(0.3)),
      targetBeneficiaryGroups: ['بیماران تنفسی و مزمن', 'زنان باردار و کودکان', 'روستاییان دورافتاده'],
      antiOverlapStatus: 'CLEAR',
      status: 'IN_PROGRESS',
      startYear: 1403,
      endYear: 1404,
      durationMonths: 12,
      progressPercentage: 55,
      description: `خرید تجهیزات تشخیصی و درمانی، تجهیز بخش اورژانس و مراقبت‌های ویژه و راه‌اندازی درمانگاه سیار برای پوشش روستاهای کم‌دسترسی ${short}`,
    },
    {
      id: `proj-${tag}-04`,
      code: `PRJ-${tag}-ENV-04`,
      title: `مهار کانون‌های گردوغبار، کمربند سبز و پایش کیفیت هوای ${county}`,
      priorityId: 'p5',
      priorityTitle: PRIORITY_TITLE_BY_ID.p5,
      departmentId: `dept-${tag}-05`,
      departmentName: `اداره حفاظت محیط زیست ${county}`,
      budgetSourceId: `src-${tag}-01`,
      budgetSourceName: `اعتبارات مسئولیت اجتماعی صنایع منطقه ${short}`,
      executorId: `exec-${tag}-01`,
      executorName: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      crisisHarmId: `crisis-${tag}-01`,
      crisisHarmTitle: 'ریزگردهای مکرر و شیوع بیماری‌های تنفسی',
      urgencyLevel: 'CRITICAL',
      administrativeLevel: 'COUNTY',
      province,
      county,
      district: `کانون‌های گردوغبار ${county}`,
      targetArea: `حریم شهری و کانون‌های بحرانی فرسایش بادی ${county}`,
      estimatedCostToman: costOf(0.16),
      currentYearAllocatedToman: costOf(0.1),
      futureYearsAllocatedToman: costOf(0.06),
      csrSharePercentage: 65,
      governmentSharePercentage: 35,
      beneficiariesCount: beneficiaryShare(1),
      costPerBeneficiaryToman: Math.round(costOf(0.16) / beneficiaryShare(1)),
      targetBeneficiaryGroups: ['کل جمعیت شهرستان', 'کودکان و سالمندان', 'بیماران تنفسی'],
      antiOverlapStatus: 'CLEAR',
      status: 'IN_PROGRESS',
      startYear: 1403,
      endYear: 1405,
      durationMonths: 24,
      progressPercentage: 30,
      description: `مالچ‌پاشی زیستی و کاشت گونه‌های مقاوم در کانون‌های گردوغبار، نصب ایستگاه‌های پایش برخط کیفیت هوا و آبیاری با پساب تصفیه‌شده در ${county}`,
    },
    {
      id: `proj-${tag}-05`,
      code: `PRJ-${tag}-JOB-05`,
      title: `اشتغال خرد، مهارت‌آموزی و توانمندسازی اقتصادی جوانان ${county}`,
      priorityId: 'p2',
      priorityTitle: PRIORITY_TITLE_BY_ID.p2,
      departmentId: `dept-${tag}-04`,
      departmentName: `شهرداری‌ها و دهیاری‌های ${county}`,
      budgetSourceId: `src-${tag}-05`,
      budgetSourceName: 'تسهیلات تبصره ۲ قانون بودجه و صندوق کارآفرینی امید (اشتغال)',
      executorId: `exec-${tag}-01`,
      executorName: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      crisisHarmId: `crisis-${tag}-03`,
      crisisHarmTitle: 'بیکاری جوانان و نبود تنوع اقتصادی',
      urgencyLevel: 'HIGH',
      administrativeLevel: 'COUNTY',
      province,
      county,
      district: `شهرها و روستاهای ${county}`,
      targetArea: `جوانان جویای کار و خانوارهای کم‌درآمد ${county}`,
      estimatedCostToman: costOf(0.14),
      currentYearAllocatedToman: costOf(0.14),
      csrSharePercentage: 25,
      bankFacilitySharePercentage: 75,
      beneficiariesCount: beneficiaryShare(0.05),
      costPerBeneficiaryToman: Math.round(costOf(0.14) / beneficiaryShare(0.05)),
      targetBeneficiaryGroups: ['جوانان جویای کار', 'زنان سرپرست خانوار', 'معتادان بهبودیافته'],
      antiOverlapStatus: 'CLEAR',
      status: 'IN_PROGRESS',
      startYear: 1403,
      endYear: 1404,
      durationMonths: 12,
      progressPercentage: 45,
      description: `برگزاری دوره‌های مهارت‌آموزی متناسب با مزیت‌های محلی ${short}، اعطای تسهیلات خرد با نظارت میدانی و راه‌اندازی کارگاه‌های کوچک تولیدی و خدماتی`,
    },
    {
      id: `proj-${tag}-06`,
      code: `PRJ-${tag}-EDU-06`,
      title: `نوسازی مدارس روستایی، تجهیز هنرستان‌ها و بورسیه دانش‌آموزان مستعد ${county}`,
      priorityId: 'p7',
      priorityTitle: PRIORITY_TITLE_BY_ID.p7,
      departmentId: `dept-${tag}-06`,
      departmentName: `اداره آموزش و پرورش ${county}`,
      budgetSourceId: `src-${tag}-01`,
      budgetSourceName: `اعتبارات مسئولیت اجتماعی صنایع منطقه ${short}`,
      executorId: `exec-${tag}-01`,
      executorName: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      contractorId: `cnt-${tag}-03`,
      contractorName: `شرکت ابنیه، تجهیزات و ساختمان جنوب ${short}`,
      urgencyLevel: 'MEDIUM',
      administrativeLevel: 'RURAL_DISTRICT',
      province,
      county,
      district: `روستاهای ${county}`,
      targetArea: `مدارس روستایی و کانکسی ${county}`,
      estimatedCostToman: costOf(0.12),
      currentYearAllocatedToman: costOf(0.08),
      futureYearsAllocatedToman: costOf(0.04),
      csrSharePercentage: 75,
      governmentSharePercentage: 25,
      beneficiariesCount: beneficiaryShare(0.09),
      costPerBeneficiaryToman: Math.round(costOf(0.12) / beneficiaryShare(0.09)),
      targetBeneficiaryGroups: ['دانش‌آموزان روستایی', 'دختران در معرض ترک تحصیل', 'خانواده‌های کم‌درآمد'],
      antiOverlapStatus: 'CLEAR',
      status: 'APPROVED',
      startYear: 1403,
      endYear: 1405,
      durationMonths: 20,
      progressPercentage: 20,
      description: `تخریب و بازسازی مدارس کانکسی و فرسوده، تجهیز کارگاه‌های هنرستانی، تأمین سرویس ایاب‌وذهاب و اعطای بورسیه تحصیلی به دانش‌آموزان مستعد کم‌برخوردار ${short}`,
    },
  ];

  if (has(profile, 'URBAN') || ind.marginalizationRate >= 15) {
    projects.push({
      id: `proj-${tag}-07`,
      code: `PRJ-${tag}-SOC-07`,
      title: `ساماندهی سکونتگاه‌های غیررسمی و محلات کم‌برخوردار ${county}`,
      priorityId: 'p10',
      priorityTitle: PRIORITY_TITLE_BY_ID.p10,
      departmentId: `dept-${tag}-04`,
      departmentName: `شهرداری‌ها و دهیاری‌های ${county}`,
      budgetSourceId: `src-${tag}-03`,
      budgetSourceName: `عوارض آلایندگی، ارزش افزوده و اعتبارات شهرداری و دهیاری‌های ${county}`,
      executorId: `exec-${tag}-01`,
      executorName: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      crisisHarmId: `crisis-${tag}-05`,
      crisisHarmTitle: 'آسیب‌های اجتماعی، اعتیاد و سکونتگاه‌های کم‌برخوردار',
      urgencyLevel: 'HIGH',
      administrativeLevel: 'COUNTY',
      province,
      county,
      district: `محلات کم‌برخوردار ${short}`,
      targetArea: `سکونتگاه‌های غیررسمی و بافت فرسوده ${county}`,
      estimatedCostToman: costOf(0.15),
      currentYearAllocatedToman: costOf(0.15),
      csrSharePercentage: 20,
      dehyariSharePercentage: 55,
      governmentSharePercentage: 25,
      beneficiariesCount: ind.vulnerableGroupsPopulation,
      costPerBeneficiaryToman: Math.round(costOf(0.15) / Math.max(ind.vulnerableGroupsPopulation, 1)),
      targetBeneficiaryGroups: ['ساکنان محلات حاشیه‌ای', 'کودکان و نوجوانان محله', 'خانوارهای کم‌درآمد'],
      antiOverlapStatus: 'CLEAR',
      status: 'IN_PROGRESS',
      startYear: 1403,
      endYear: 1405,
      durationMonths: 18,
      progressPercentage: 25,
      description: `بهسازی معابر و روشنایی محله‌ای، احداث مرکز خدمات اجتماعی، ساماندهی اراضی و اسناد، تأمین مسکن محرومان و برنامه‌های پیشگیری از آسیب اجتماعی در ${short}`,
    });
  }

  if (has(profile, 'MOUNTAIN') || has(profile, 'BORDER')) {
    projects.push({
      id: `proj-${tag}-08`,
      code: `PRJ-${tag}-RUR-08`,
      title: `توسعه زیرساخت آبادی‌های پراکنده و حمایت از معیشت عشایری ${county}`,
      priorityId: 'p1',
      priorityTitle: PRIORITY_TITLE_BY_ID.p1,
      departmentId: `dept-${tag}-10`,
      departmentName: `امور عشایر و توسعه روستایی ${county}`,
      budgetSourceId: `src-${tag}-04`,
      budgetSourceName: 'بنیادهای حمایتی و محرومیت‌زدایی (بنیاد برکت و بنیاد علوی)',
      executorId: `exec-${tag}-01`,
      executorName: `قرارگاه جهادی و بسیج سازندگی ${short}`,
      crisisHarmId: `crisis-${tag}-04`,
      crisisHarmTitle: 'چالش شاخص توسعه شهرستان',
      urgencyLevel: 'MEDIUM',
      administrativeLevel: 'RURAL_DISTRICT',
      province,
      county,
      district: `آبادی‌های پراکنده ${county}`,
      targetArea: `روستاها و مناطق عشایری ${county}`,
      estimatedCostToman: costOf(0.13),
      currentYearAllocatedToman: costOf(0.09),
      futureYearsAllocatedToman: costOf(0.04),
      csrSharePercentage: 20,
      governmentSharePercentage: 60,
      charitySharePercentage: 20,
      beneficiariesCount: beneficiaryShare(0.12),
      costPerBeneficiaryToman: Math.round(costOf(0.13) / beneficiaryShare(0.12)),
      targetBeneficiaryGroups: ['خانوارهای عشایری', 'روستاییان دورافتاده', 'دامداران'],
      antiOverlapStatus: 'CLEAR',
      status: 'APPROVED',
      startYear: 1403,
      endYear: 1405,
      durationMonths: 24,
      progressPercentage: 15,
      description: `آبرسانی سیار و پایدار، راه‌سازی دسترسی، برق‌رسانی خورشیدی و حمایت از زنجیره معیشت دامداری و صنایع دستی عشایری در آبادی‌های پراکنده ${short}`,
    });
  }

  /* ---------------------------- کاربران شهرستان ---------------------------- */
  // روستر سازمانی هر شهرستان از دستگاه‌های واقعی همان شهرستان ساخته می‌شود تا
  // تب «نقش‌ها و دسترسی» هرگز نام شهرستان دیگری را نشان ندهد.
  const users: UserProfile[] = [
    {
      id: `user-${tag}-01`,
      name: 'فرماندار شهرستان',
      role: 'PROVINCIAL_GOVERNOR',
      roleFa: 'فرماندار',
      roleTitleFa: `فرماندار و رئیس کمیته برنامه‌ریزی ${county}`,
      avatar: 'ف',
      organization: `فرمانداری ${county}`,
      province,
      county,
    },
    {
      id: `user-${tag}-02`,
      name: 'مدیر امور آب و فاضلاب',
      role: 'DEPARTMENT_HEAD',
      roleFa: 'مدیر اداره',
      roleTitleFa: `مدیر امور آب و فاضلاب ${county}`,
      avatar: 'آ',
      organization: `امور آب و فاضلاب ${county} (شرکت آب و فاضلاب خوزستان)`,
      departmentId: `dept-${tag}-01`,
      province,
      county,
    },
    {
      id: `user-${tag}-03`,
      name: 'مدیر شبکه بهداشت و درمان',
      role: 'REGIONAL_MANAGER',
      roleFa: 'مدیر منطقه‌ای',
      roleTitleFa: `رئیس شبکه بهداشت و درمان ${county}`,
      avatar: 'ب',
      organization: `شبکه بهداشت و درمان ${county}`,
      departmentId: `dept-${tag}-02`,
      province,
      county,
    },
    {
      id: `user-${tag}-04`,
      name: 'رئیس اداره راهداری',
      role: 'PLANNING_SPECIALIST',
      roleFa: 'کارشناس برنامه‌ریزی',
      roleTitleFa: `رئیس اداره راهداری و حمل‌ونقل جاده‌ای ${county}`,
      avatar: 'ر',
      organization: `اداره راهداری و حمل‌ونقل جاده‌ای ${county}`,
      departmentId: `dept-${tag}-03`,
      province,
      county,
    },
    {
      id: `user-${tag}-05`,
      name: 'نماینده شورای اسلامی و دهیاری‌ها',
      role: 'DEHYAR_COUNCIL',
      roleFa: 'شورای دهیاری',
      roleTitleFa: `نماینده شوراها و دهیاری‌های ${county}`,
      avatar: 'ش',
      organization: `شورای اسلامی و دهیاری‌های ${county}`,
      province,
      county,
    },
  ];

  const industryUser = has(profile, 'PETCHEM')
    ? {
        name: 'مدیرعامل مجتمع پتروشیمی منطقه',
        roleTitleFa: `مدیر مجتمع‌های پتروشیمی منطقه ویژه ${short} و راهبر CSR`,
        organization: `مجتمع‌های پتروشیمی منطقه ویژه ${short}`,
      }
    : has(profile, 'OIL')
      ? {
          name: 'مدیر مسئولیت اجتماعی صنعت نفت',
          roleTitleFa: `مدیر مسئولیت‌های اجتماعی نفت و گاز منطقه ${short}`,
          organization: `شرکت بهره‌برداری نفت و گاز منطقه ${short}`,
        }
      : has(profile, 'PORT')
        ? {
            name: 'مدیر بندر و دریانوردی',
            roleTitleFa: `مدیر بندر و دریانوردی ${short}`,
            organization: `بندر و دریانوردی ${short}`,
          }
        : null;

  if (industryUser) {
    users.push({
      id: `user-${tag}-06`,
      name: industryUser.name,
      role: 'REGIONAL_MANAGER',
      roleFa: 'مدیر منطقه‌ای',
      roleTitleFa: industryUser.roleTitleFa,
      avatar: 'ص',
      organization: industryUser.organization,
      province,
      county,
    });
  }

  users.push({
    id: `user-${tag}-09`,
    name: 'حسابرس و ناظر شفافیت مالی',
    role: 'AUDITOR',
    roleFa: 'حسابرس',
    roleTitleFa: `ناظر عالی حقوق عامه و شفافیت مالی ${county}`,
    avatar: 'ح',
    organization: `دادگستری و مجمع صیانت از بیت‌المال ${county}`,
    province,
    county,
  });

  /* ---------------------------- لاگ‌های نظارتی ---------------------------- */
  const auditLogs: AuditLogItem[] = [
    {
      id: `log-${tag}-01`,
      timestamp: '1403/11/10 - 10:30',
      userName: `فرماندار ${county}`,
      userRole: 'PROVINCIAL_GOVERNOR',
      actionType: 'BUDGET_UPDATE',
      oldValue: '۳,۰۰۰ میلیارد تومان',
      newValue: `${formatBillion(budget)} میلیارد تومان`,
      rationale: `تصویب سقف اعتبارات توسعه متوازن ${county} بر پایه جمعیت ${population.toLocaleString('fa-IR')} نفری و شاخص محرومیت ${ind.povertyRate.toFixed(1)} درصد`,
      province,
      county,
    },
    {
      id: `log-${tag}-02`,
      timestamp: '1403/11/25 - 14:15',
      userName: `مدیر امور آب و فاضلاب ${county}`,
      userRole: 'DEPARTMENT_HEAD',
      actionType: 'PERCENTAGE_CHANGE',
      targetPriorityTitle: PRIORITY_TITLE_BY_ID.p1,
      oldValue: '12%',
      newValue: '15%',
      rationale: `تطبیق با گزارش تنش آبی و کمبود زیرساخت ${ind.infrastructureDeficit.toFixed(0)} درصدی آب شرب شهری و روستایی ${short}`,
      province,
      county,
    },
    {
      id: `log-${tag}-03`,
      timestamp: '1404/01/18 - 11:20',
      userName: `مدیر شبکه بهداشت و درمان ${county}`,
      userRole: 'DEPARTMENT_HEAD',
      actionType: 'DUPLICATE_FLAGGED',
      targetPriorityTitle: PRIORITY_TITLE_BY_ID.p5,
      oldValue: 'بدون بررسی',
      newValue: `هشدار هم‌پوشانی طرح‌های محیط‌زیستی ${short}`,
      rationale: `جلوگیری از صرف اعتبار تکراری برای مهار کانون‌های گردوغبار و هدایت آن به خدمات درمان تنفسی (ریسک محیط‌زیستی ${ind.environmentalRiskScore.toFixed(0)} از ۱۰۰)`,
      province,
      county,
    },
  ];

  return { departments, budgetSources, crisesHarms, executors, contractors, projects, users, auditLogs };
}
