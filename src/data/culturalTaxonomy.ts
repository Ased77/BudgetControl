/**
 * Cultural taxonomy — the shared reference map for cultural budgets and CSR.
 *
 * The taxonomy is intentionally data-only: it is the stable vocabulary that
 * needs assessment, priority setting, project registration and reporting read
 * from. `CT-xx` codes are the join key; titles are display text and may change.
 *
 * This first version is read-only. Editing, persistence and assigning a domain
 * to existing records belong to later phases (see docs/CULTURAL-TAXONOMY.md).
 */

export const CULTURAL_TAXONOMY_VERSION = '۱٫۱';
export const CULTURAL_TAXONOMY_REVIEW_STATUS = 'در انتظار تأیید متولی';

export type CulturalIndicatorFamily =
  | 'SUPPLY'
  | 'PARTICIPATION'
  | 'EQUITY'
  | 'WORKFORCE'
  | 'HERITAGE';

export type CulturalDeliveryMode = 'GRANT' | 'CAPEX' | 'OPEX' | 'PROGRAM' | 'IN_KIND';

export type CulturalEvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type CulturalDomainIconKey =
  | 'book'
  | 'theater'
  | 'music'
  | 'film'
  | 'palette'
  | 'heritage'
  | 'museum'
  | 'literature'
  | 'ritual'
  | 'sport'
  | 'artsEducation'
  | 'diplomacy';

export type CulturalTone =
  | 'rose'
  | 'emerald'
  | 'violet'
  | 'sky'
  | 'fuchsia'
  | 'amber'
  | 'teal'
  | 'indigo'
  | 'cyan'
  | 'orange'
  | 'lime'
  | 'blue';

export interface CulturalIndicator {
  id: string;
  label: string;
  family: CulturalIndicatorFamily;
  unit: string;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
  description: string;
  /** Provenance fields stay absent until the taxonomy owner records them. */
  source?: string;
  /** Reference period as a Persian display string, e.g. «۱۴۰۳». */
  referenceYear?: string;
  confidence?: CulturalEvidenceConfidence;
}

export interface CulturalAction {
  id: string;
  title: string;
  description: string;
  mode: CulturalDeliveryMode;
}

export interface CulturalTaxonomyReference {
  version: string;
  reviewStatus: string;
  families: Record<CulturalIndicatorFamily, string>;
  deliveryModes: Record<CulturalDeliveryMode, string>;
  evidenceConfidence: Record<CulturalEvidenceConfidence, string>;
  evidencePendingLabel: string;
  domains: CulturalDomain[];
  indicators: CulturalIndicator[];
}

export interface CulturalDomain {
  id: string;
  /** Stable join key shared by needs, priorities, projects and reports. */
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: CulturalDomainIconKey;
  tone: CulturalTone;
  indicators: string[];
  actions: CulturalAction[];
  outcomes: string[];
  /** Existing priority ids that partially cover this domain, if any. */
  relatedPriorityIds: string[];
  budgetClassification: string;
  keywords: string[];
}

export const CULTURAL_FAMILY_LABELS: Record<CulturalIndicatorFamily, string> = {
  SUPPLY: 'عرضه و زیرساخت',
  PARTICIPATION: 'مشارکت و مخاطب',
  EQUITY: 'عدالت و دسترسی',
  WORKFORCE: 'نیروی انسانی و تشکل‌ها',
  HERITAGE: 'میراث و حفاظت',
};

export const CULTURAL_DELIVERY_MODE_LABELS: Record<CulturalDeliveryMode, string> = {
  GRANT: 'گرنت',
  CAPEX: 'سرمایه‌ای',
  OPEX: 'جاری',
  PROGRAM: 'برنامه',
  IN_KIND: 'غیرنقدی',
};

export const CULTURAL_EVIDENCE_CONFIDENCE_LABELS: Record<CulturalEvidenceConfidence, string> = {
  HIGH: 'بالا',
  MEDIUM: 'متوسط',
  LOW: 'پایین',
};

export const CULTURAL_EVIDENCE_PENDING_LABEL = 'ثبت نشده';

/** Complete evidence means all three provenance fields are recorded. */
export function hasCulturalIndicatorEvidence(indicator: CulturalIndicator): boolean {
  return Boolean(indicator.source && indicator.referenceYear && indicator.confidence);
}

/** Read-only payload shared by the API and future clients. */
export function getCulturalTaxonomyReference(): CulturalTaxonomyReference {
  return {
    version: CULTURAL_TAXONOMY_VERSION,
    reviewStatus: CULTURAL_TAXONOMY_REVIEW_STATUS,
    families: CULTURAL_FAMILY_LABELS,
    deliveryModes: CULTURAL_DELIVERY_MODE_LABELS,
    evidenceConfidence: CULTURAL_EVIDENCE_CONFIDENCE_LABELS,
    evidencePendingLabel: CULTURAL_EVIDENCE_PENDING_LABEL,
    domains: CULTURAL_DOMAINS,
    indicators: CULTURAL_INDICATORS,
  };
}

export const CULTURAL_INDICATORS: CulturalIndicator[] = [
  {
    id: 'cultural-floor-area',
    label: 'سرانه زیربنای فرهنگی',
    family: 'SUPPLY',
    unit: 'مترمربع به ازای ۱٬۰۰۰ نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'مجموع زیربنای فضاهای فرهنگی ثبت‌شده به ازای هر هزار نفر جمعیت.',
  },
  {
    id: 'library-seats',
    label: 'صندلی مطالعه کتابخانه',
    family: 'SUPPLY',
    unit: 'صندلی به ازای ۱۰٬۰۰۰ نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'ظرفیت نشستن و مطالعه در کتابخانه‌های عمومی محدوده.',
  },
  {
    id: 'cinema-screens',
    label: 'سالن سینما',
    family: 'SUPPLY',
    unit: 'سالن به ازای ۱۰۰٬۰۰۰ نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'تعداد سالن‌های سینمای فعال و در دسترس در محدوده.',
  },
  {
    id: 'theatre-stages',
    label: 'صحنه نمایش فعال',
    family: 'SUPPLY',
    unit: 'صحنه به ازای ۱۰۰٬۰۰۰ نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'صحنه‌های مجهز و فعال برای اجرای نمایش حرفه‌ای و مردمی.',
  },
  {
    id: 'museum-space',
    label: 'فضای موزه',
    family: 'SUPPLY',
    unit: 'مترمربع به ازای ۱۰۰٬۰۰۰ نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'فضای نمایش و نگهداری گنجینه‌های موزه‌ای در محدوده.',
  },
  {
    id: 'sport-space',
    label: 'سرانه فضای ورزشی',
    family: 'SUPPLY',
    unit: 'مترمربع به ازای ۱٬۰۰۰ نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'فضای ورزشی سرپوشیده و روباز در دسترس عموم.',
  },
  {
    id: 'cultural-participation',
    label: 'نرخ مشارکت فرهنگی',
    family: 'PARTICIPATION',
    unit: 'درصد',
    direction: 'HIGHER_IS_BETTER',
    description: 'سهم جمعیت که در سال گذشته حداقل یک فعالیت فرهنگی داشته است.',
  },
  {
    id: 'library-membership',
    label: 'عضویت فعال کتابخانه',
    family: 'PARTICIPATION',
    unit: 'درصد جمعیت',
    direction: 'HIGHER_IS_BETTER',
    description: 'اعضای فعال کتابخانه نسبت به جمعیت محدوده.',
  },
  {
    id: 'event-attendance',
    label: 'سرانه حضور در رویداد',
    family: 'PARTICIPATION',
    unit: 'نفر-بار در سال',
    direction: 'HIGHER_IS_BETTER',
    description: 'میانگین حضور سالانه هر نفر در رویدادهای فرهنگی.',
  },
  {
    id: 'audience-satisfaction',
    label: 'رضایت مخاطب',
    family: 'PARTICIPATION',
    unit: 'امتیاز ۰–۱۰۰',
    direction: 'HIGHER_IS_BETTER',
    description: 'میانگین رضایت سنجیده‌شده از مخاطبان رویدادها و فضاهای فرهنگی.',
  },
  {
    id: 'cultural-spend-per-capita',
    label: 'سرانه هزینه فرهنگی',
    family: 'EQUITY',
    unit: 'تومان',
    direction: 'HIGHER_IS_BETTER',
    description: 'هزینه عمومی فرهنگی به ازای هر نفر در محدوده.',
  },
  {
    id: 'venue-access-distance',
    label: 'دسترسی به نزدیک‌ترین فضای فرهنگی',
    family: 'EQUITY',
    unit: 'دقیقه',
    direction: 'LOWER_IS_BETTER',
    description: 'میانگین زمان سفر تا نزدیک‌ترین فضای فرهنگی.',
  },
  {
    id: 'accessible-venues',
    label: 'سهم فضاهای مناسب‌سازی‌شده',
    family: 'EQUITY',
    unit: 'درصد',
    direction: 'HIGHER_IS_BETTER',
    description: 'سهم فضاهای فرهنگی دارای دسترسی برای افراد دارای معلولیت.',
  },
  {
    id: 'women-youth-participation',
    label: 'سهم زنان و جوانان',
    family: 'EQUITY',
    unit: 'درصد',
    direction: 'HIGHER_IS_BETTER',
    description: 'سهم زنان و جوانان از مشارکت‌کنندگان در فعالیت‌های فرهنگی.',
  },
  {
    id: 'cultural-workers',
    label: 'شاغلان فرهنگی',
    family: 'WORKFORCE',
    unit: 'نفر',
    direction: 'HIGHER_IS_BETTER',
    description: 'شاغلان بخش فرهنگ، هنر و رسانه در محدوده.',
  },
  {
    id: 'cultural-ngos',
    label: 'تشکل‌های فعال فرهنگی',
    family: 'WORKFORCE',
    unit: 'تعداد',
    direction: 'HIGHER_IS_BETTER',
    description: 'سازمان‌های مردم‌نهاد و تشکل‌های فرهنگی فعال در محدوده.',
  },
  {
    id: 'creative-firms',
    label: 'بنگاه‌های صنایع خلاق',
    family: 'WORKFORCE',
    unit: 'تعداد',
    direction: 'HIGHER_IS_BETTER',
    description: 'بنگاه‌های فعال در صنایع خلاق و فرهنگی.',
  },
  {
    id: 'published-titles',
    label: 'عناوین منتشرشده',
    family: 'WORKFORCE',
    unit: 'عنوان در سال',
    direction: 'HIGHER_IS_BETTER',
    description: 'کتاب‌ها و آثار منتشرشده در محدوده.',
  },
  {
    id: 'heritage-at-risk',
    label: 'آثار در معرض خطر',
    family: 'HERITAGE',
    unit: 'تعداد',
    direction: 'LOWER_IS_BETTER',
    description: 'آثار ثبت‌شده با خطر تخریب یا فرسایش.',
  },
  {
    id: 'restoration-backlog',
    label: 'عقب‌ماندگی مرمت',
    family: 'HERITAGE',
    unit: 'تعداد',
    direction: 'LOWER_IS_BETTER',
    description: 'آثار دارای پرونده مرمت معوق در محدوده.',
  },
  {
    id: 'digitized-heritage',
    label: 'سهم دیجیتال‌سازی میراث',
    family: 'HERITAGE',
    unit: 'درصد',
    direction: 'HIGHER_IS_BETTER',
    description: 'سهم آثار و گنجینه‌های دیجیتال‌سازی‌شده از کل آثار ثبت‌شده.',
  },
];

export const CULTURAL_INDICATORS_BY_ID: Record<string, CulturalIndicator> = Object.fromEntries(
  CULTURAL_INDICATORS.map((indicator) => [indicator.id, indicator])
);

export const CULTURAL_DOMAINS: CulturalDomain[] = [
  {
    id: 'book-reading',
    code: 'CT-01',
    title: 'کتاب و کتابخوانی',
    shortTitle: 'کتاب',
    description: 'دسترسی عادلانه به کتاب و کتابخانه، تقویت عادت مطالعه و حمایت از نشر بومی.',
    icon: 'book',
    tone: 'emerald',
    indicators: [
      'library-seats',
      'library-membership',
      'published-titles',
      'venue-access-distance',
      'cultural-spend-per-capita',
    ],
    actions: [
      {
        id: 'ct01-a1',
        title: 'تجهیز و به‌روزرسانی کتابخانه‌های عمومی',
        description: 'خرید کتاب، تجهیز قفسه و فضا و به‌روزرسانی منابع کتابخانه‌های شهر و روستا.',
        mode: 'CAPEX',
      },
      {
        id: 'ct01-a2',
        title: 'باشگاه کتابخوانی و امانت دیجیتال',
        description: 'راه‌اندازی باشگاه‌های محلی و سامانه امانت دیجیتال برای دسترسی دور.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct01-a3',
        title: 'خرید کتاب و حمایت از نشر بومی',
        description: 'خرید آثار ناشران محلی و توزیع در مناطق کم‌برخوردار.',
        mode: 'GRANT',
      },
    ],
    outcomes: ['افزایش عضویت فعال کتابخانه', 'کاهش شکاف دسترسی به کتاب در روستاها'],
    relatedPriorityIds: ['p7'],
    budgetClassification: 'فصل فرهنگ و هنر — کتابخانه‌های عمومی و نشر',
    keywords: ['کتاب', 'کتابخانه', 'کتابخوانی', 'نشر', 'book', 'library', 'reading'],
  },
  {
    id: 'performing-arts',
    code: 'CT-02',
    title: 'هنرهای نمایشی',
    shortTitle: 'نمایش',
    description: 'تولید و اجرای نمایش در شهرها و روستاها، حمایت از گروه‌های نمایشی و جشنواره‌های محلی.',
    icon: 'theater',
    tone: 'rose',
    indicators: ['theatre-stages', 'event-attendance', 'audience-satisfaction', 'cultural-workers'],
    actions: [
      {
        id: 'ct02-a1',
        title: 'تولید و اجرای تئاتر حرفه‌ای و خیابانی',
        description: 'حمایت از تولید آثار نمایشی و اجرای آن‌ها در فضاهای شهری و روستایی.',
        mode: 'GRANT',
      },
      {
        id: 'ct02-a2',
        title: 'حمایت از گروه‌های نمایشی جوان',
        description: 'کمک به شکل‌گیری، تمرین و اولین اجرای گروه‌های نمایشی جوان.',
        mode: 'GRANT',
      },
      {
        id: 'ct02-a3',
        title: 'جشنواره نمایشی شهرستانی',
        description: 'برگزاری رویداد نمایشی محلی برای معرفی آثار و ایجاد مخاطب.',
        mode: 'PROGRAM',
      },
    ],
    outcomes: ['افزایش اجرا و مخاطب', 'اشتغال هنرمندان نمایشی'],
    relatedPriorityIds: ['p6'],
    budgetClassification: 'فصل فرهنگ و هنر — هنرهای نمایشی',
    keywords: ['تئاتر', 'نمایش', 'صحنه', 'جشنواره', 'theater', 'drama', 'performance'],
  },
  {
    id: 'music',
    code: 'CT-03',
    title: 'موسیقی و سرود',
    shortTitle: 'موسیقی',
    description: 'حمایت از تولید، اجرا و آموزش موسیقی بومی و مردمی.',
    icon: 'music',
    tone: 'violet',
    indicators: ['event-attendance', 'cultural-workers', 'audience-satisfaction', 'cultural-participation'],
    actions: [
      {
        id: 'ct03-a1',
        title: 'تولید و انتشار موسیقی بومی',
        description: 'ضبط، انتشار و توزیع آثار موسیقی محلی و فولکلور.',
        mode: 'GRANT',
      },
      {
        id: 'ct03-a2',
        title: 'کنسرت محلی و سرود مردمی',
        description: 'برگزاری اجراهای محلی و تولید سرودهای مناسبتی و مردمی.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct03-a3',
        title: 'تجهیز و آموزش گروه‌های موسیقی',
        description: 'تأمین ساز، فضا و آموزش برای گروه‌های موسیقی محلی.',
        mode: 'CAPEX',
      },
    ],
    outcomes: ['احیای موسیقی محلی', 'افزایش مشارکت جوانان'],
    relatedPriorityIds: ['p6'],
    budgetClassification: 'فصل فرهنگ و هنر — موسیقی',
    keywords: ['موسیقی', 'سرود', 'کنسرت', 'سازی', 'music', 'concert', 'song'],
  },
  {
    id: 'cinema-media',
    code: 'CT-04',
    title: 'سینما و رسانه',
    shortTitle: 'سینما',
    description: 'تولید و اکران فیلم، تجهیز سالن‌های سینما و ارتقای سواد رسانه‌ای.',
    icon: 'film',
    tone: 'sky',
    indicators: ['cinema-screens', 'event-attendance', 'creative-firms', 'cultural-workers'],
    actions: [
      {
        id: 'ct04-a1',
        title: 'تولید فیلم کوتاه و مستند بومی',
        description: 'حمایت از فیلم‌سازان محلی برای روایت مسائل و ظرفیت‌های منطقه.',
        mode: 'GRANT',
      },
      {
        id: 'ct04-a2',
        title: 'اکران و تجهیز سالن سینما',
        description: 'بهبود کیفیت اکران و تجهیز سالن‌های موجود.',
        mode: 'CAPEX',
      },
      {
        id: 'ct04-a3',
        title: 'کارگاه سواد رسانه‌ای و فیلم‌سازی',
        description: 'آموزش تولید و تحلیل محتوای تصویری برای جوانان.',
        mode: 'PROGRAM',
      },
    ],
    outcomes: ['افزایش دسترسی به اکران', 'تولید محتوای بومی'],
    relatedPriorityIds: [],
    budgetClassification: 'فصل فرهنگ و هنر — سینما و رسانه',
    keywords: ['سینما', 'فیلم', 'رسانه', 'مستند', 'cinema', 'film', 'media'],
  },
  {
    id: 'visual-arts-creative',
    code: 'CT-05',
    title: 'هنرهای تجسمی و صنایع خلاق',
    shortTitle: 'هنرهای تجسمی',
    description: 'حمایت از هنرهای تجسمی، صنایع دستی و کسب‌وکارهای خلاق.',
    icon: 'palette',
    tone: 'fuchsia',
    indicators: ['creative-firms', 'cultural-workers', 'event-attendance', 'cultural-ngos', 'cultural-participation'],
    actions: [
      {
        id: 'ct05-a1',
        title: 'نمایشگاه و بازارچه هنرهای تجسمی',
        description: 'ایجاد بازار فروش و دیده‌شدن برای هنرمندان تجسمی و صنایع دستی.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct05-a2',
        title: 'حمایت از صنایع دستی و طراحی بومی',
        description: 'کمک به تولید، بسته‌بندی و بازاریابی محصولات بومی.',
        mode: 'GRANT',
      },
      {
        id: 'ct05-a3',
        title: 'کارگاه هنری محله',
        description: 'برگزاری کارگاه‌های آموزشی کوتاه در محلات کم‌برخوردار.',
        mode: 'PROGRAM',
      },
    ],
    outcomes: ['افزایش فروش و درآمد هنرمندان', 'رونق صنایع خلاق'],
    relatedPriorityIds: [],
    budgetClassification: 'فصل فرهنگ و هنر — هنرهای تجسمی و صنایع خلاق',
    keywords: ['هنر', 'تجسمی', 'صنایع دستی', 'طراحی', 'creative', 'craft', 'visual arts'],
  },
  {
    id: 'heritage-conservation',
    code: 'CT-06',
    title: 'میراث فرهنگی و مرمت',
    shortTitle: 'میراث',
    description: 'حفاظت، مرمت و مستندسازی میراث فرهنگی و تاریخی.',
    icon: 'heritage',
    tone: 'amber',
    indicators: [
      'heritage-at-risk',
      'restoration-backlog',
      'digitized-heritage',
      'cultural-spend-per-capita',
      'venue-access-distance',
    ],
    actions: [
      {
        id: 'ct06-a1',
        title: 'مرمت اضطراری آثار در معرض خطر',
        description: 'اولویت‌بندی و مرمت آثاری که خطر تخریب آن‌ها فوری است.',
        mode: 'CAPEX',
      },
      {
        id: 'ct06-a2',
        title: 'مستندسازی و ثبت آثار',
        description: 'ثبت، عکاسی و تهیه پرونده فنی برای آثار شناسایی‌شده.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct06-a3',
        title: 'حفاظت مشارکتی با جوامع محلی',
        description: 'سپردن نگهداری روزمره آثار به تشکل‌ها و ساکنان محلی با نظارت فنی.',
        mode: 'IN_KIND',
      },
    ],
    outcomes: ['کاهش ریسک تخریب', 'افزایش آثار حفاظت‌شده'],
    relatedPriorityIds: [],
    budgetClassification: 'فصل میراث فرهنگی — حفاظت و مرمت',
    keywords: ['میراث', 'مرمت', 'بنا', 'تاریخی', 'heritage', 'restoration', 'conservation'],
  },
  {
    id: 'museums-collections',
    code: 'CT-07',
    title: 'موزه‌ها و گنجینه‌ها',
    shortTitle: 'موزه',
    description: 'تجهیز، دیجیتال‌سازی و برنامه‌های آموزشی موزه‌ها و گنجینه‌ها.',
    icon: 'museum',
    tone: 'teal',
    indicators: ['museum-space', 'event-attendance', 'digitized-heritage', 'cultural-floor-area'],
    actions: [
      {
        id: 'ct07-a1',
        title: 'تجهیز و به‌روزرسانی موزه محلی',
        description: 'بهبود ویترین، نورپردازی، امنیت و مسیر بازدید موزه.',
        mode: 'CAPEX',
      },
      {
        id: 'ct07-a2',
        title: 'دیجیتال‌سازی گنجینه‌ها',
        description: 'اسکن، فهرست‌نویسی و انتشار دیجیتال آثار موزه‌ای.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct07-a3',
        title: 'برنامه آموزشی و راهنمای موزه',
        description: 'طراحی تورهای آموزشی و برنامه‌های مدرسه‌محور.',
        mode: 'OPEX',
      },
    ],
    outcomes: ['افزایش بازدید', 'دسترسی دیجیتال به گنجینه‌ها'],
    relatedPriorityIds: [],
    budgetClassification: 'فصل میراث فرهنگی — موزه‌ها',
    keywords: ['موزه', 'گنجینه', 'بازدید', 'museum', 'collection', 'exhibition'],
  },
  {
    id: 'literature-language',
    code: 'CT-08',
    title: 'ادبیات و زبان',
    shortTitle: 'ادبیات',
    description: 'حمایت از ادبیات، نشر، ترجمه و پاسداشت زبان‌ها و گویش‌های محلی.',
    icon: 'literature',
    tone: 'indigo',
    indicators: ['published-titles', 'library-membership', 'cultural-workers', 'cultural-ngos'],
    actions: [
      {
        id: 'ct08-a1',
        title: 'جایزه و محفل ادبی',
        description: 'برگزاری محافل خوانش و جایزه‌های ادبی منطقه‌ای.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct08-a2',
        title: 'پاسداشت زبان‌ها و گویش‌های محلی',
        description: 'ثبت، آموزش و انتشار آثار به زبان‌ها و گویش‌های بومی.',
        mode: 'GRANT',
      },
      {
        id: 'ct08-a3',
        title: 'حمایت از نشر و ترجمه',
        description: 'کمک به انتشار آثار ادبی و ترجمه متون فرهنگی.',
        mode: 'GRANT',
      },
    ],
    outcomes: ['تولید و انتشار آثار', 'حفظ تنوع زبانی'],
    relatedPriorityIds: ['p7'],
    budgetClassification: 'فصل فرهنگ و هنر — ادبیات و نشر',
    keywords: ['ادبیات', 'زبان', 'گویش', 'نشر', 'ترجمه', 'literature', 'language', 'translation'],
  },
  {
    id: 'ritual-culture',
    code: 'CT-09',
    title: 'فرهنگ دینی و آیینی',
    shortTitle: 'فرهنگ آیینی',
    description: 'حمایت از آیین‌ها، هیئت‌ها و فضاهای فرهنگی دینی و آیینی.',
    icon: 'ritual',
    tone: 'cyan',
    indicators: ['event-attendance', 'accessible-venues', 'cultural-spend-per-capita', 'cultural-participation'],
    actions: [
      {
        id: 'ct09-a1',
        title: 'حمایت از آیین‌ها و هیئت‌های محلی',
        description: 'کمک به برگزاری آیین‌های مذهبی و آیینی محلی.',
        mode: 'GRANT',
      },
      {
        id: 'ct09-a2',
        title: 'تجهیز فضای آیینی',
        description: 'بهبود ایمنی، دسترسی و تجهیزات فضاهای برگزاری آیین.',
        mode: 'CAPEX',
      },
      {
        id: 'ct09-a3',
        title: 'مستندسازی آیین‌های بومی',
        description: 'ثبت تصویری و مکتوب آیین‌های در معرض فراموشی.',
        mode: 'PROGRAM',
      },
    ],
    outcomes: ['تقویت همبستگی محلی', 'حفظ آیین‌های بومی'],
    relatedPriorityIds: ['p6'],
    budgetClassification: 'فصل فرهنگ و هنر — فعالیت‌های دینی و آیینی',
    keywords: ['آیین', 'مذهبی', 'هیئت', 'مناسک', 'ritual', 'religious', 'ceremony'],
  },
  {
    id: 'sport-leisure',
    code: 'CT-10',
    title: 'ورزش و اوقات فراغت',
    shortTitle: 'ورزش',
    description: 'توسعه ورزش همگانی، فضاهای ورزشی و برنامه‌های اوقات فراغت.',
    icon: 'sport',
    tone: 'orange',
    indicators: ['sport-space', 'event-attendance', 'women-youth-participation', 'venue-access-distance'],
    actions: [
      {
        id: 'ct10-a1',
        title: 'احداث و تجهیز سالن ورزشی محلی',
        description: 'ساخت یا بهسازی فضای ورزشی در محلات و روستاها.',
        mode: 'CAPEX',
      },
      {
        id: 'ct10-a2',
        title: 'المپیاد و رویداد ورزشی',
        description: 'برگزاری رقابت‌ها و رویدادهای ورزشی محلی.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct10-a3',
        title: 'برنامه اوقات فراغت خانواده',
        description: 'طراحی برنامه‌های تفریحی و ورزشی برای خانواده‌ها.',
        mode: 'PROGRAM',
      },
    ],
    outcomes: ['افزایش مشارکت ورزشی', 'کاهش آسیب‌های اجتماعی'],
    relatedPriorityIds: ['p6'],
    budgetClassification: 'فصل ورزش و جوانان — ورزش همگانی و اوقات فراغت',
    keywords: ['ورزش', 'اوقات فراغت', 'سالن', 'المپیاد', 'sport', 'leisure', 'recreation'],
  },
  {
    id: 'arts-education',
    code: 'CT-11',
    title: 'آموزش هنر و استعدادیابی',
    shortTitle: 'آموزش هنر',
    description: 'آموزش هنر، استعدادیابی و تربیت مربیان فرهنگی.',
    icon: 'artsEducation',
    tone: 'lime',
    indicators: [
      'cultural-workers',
      'women-youth-participation',
      'event-attendance',
      'cultural-ngos',
      'cultural-floor-area',
    ],
    actions: [
      {
        id: 'ct11-a1',
        title: 'کارگاه هنری در مدارس',
        description: 'برگزاری کارگاه‌های کوتاه هنری برای دانش‌آموزان.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct11-a2',
        title: 'بورس استعدادهای هنری',
        description: 'حمایت مالی از هنرجویان مستعد برای ادامه آموزش.',
        mode: 'GRANT',
      },
      {
        id: 'ct11-a3',
        title: 'آموزش مربیان هنر',
        description: 'توانمندسازی معلمان و مربیان برای آموزش هنر.',
        mode: 'OPEX',
      },
    ],
    outcomes: ['افزایش دسترسی آموزش هنر', 'پرورش استعدادها'],
    relatedPriorityIds: ['p7'],
    budgetClassification: 'فصل فرهنگ و هنر — آموزش هنر',
    keywords: ['آموزش', 'هنر', 'استعداد', 'مربی', 'arts education', 'training', 'talent'],
  },
  {
    id: 'cultural-diplomacy',
    code: 'CT-12',
    title: 'دیپلماسی فرهنگی و رویدادها',
    shortTitle: 'دیپلماسی فرهنگی',
    description: 'رویدادها و تبادل فرهنگی بین‌المللی و معرفی هنر و میراث ایران.',
    icon: 'diplomacy',
    tone: 'blue',
    indicators: ['event-attendance', 'audience-satisfaction', 'creative-firms', 'cultural-participation'],
    actions: [
      {
        id: 'ct12-a1',
        title: 'جشنواره بین‌المللی',
        description: 'برگزاری رویداد فرهنگی با حضور مهمانان و آثار بین‌المللی.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct12-a2',
        title: 'تبادل فرهنگی و خواهرخواندگی',
        description: 'ایجاد پیوند فرهنگی با شهرها و نهادهای خارجی.',
        mode: 'PROGRAM',
      },
      {
        id: 'ct12-a3',
        title: 'نمایش آثار هنری در خارج',
        description: 'حمایت از حضور هنرمندان و آثار ایرانی در رویدادهای خارجی.',
        mode: 'GRANT',
      },
    ],
    outcomes: ['افزایش تعامل فرهنگی', 'معرفی میراث و هنر ایران'],
    relatedPriorityIds: [],
    budgetClassification: 'فصل فرهنگ و هنر — روابط فرهنگی بین‌الملل',
    keywords: ['دیپلماسی', 'بین‌الملل', 'جشنواره', 'تبادل فرهنگی', 'diplomacy', 'international', 'exchange'],
  },
];

export const CULTURAL_DOMAINS_BY_CODE: Record<string, CulturalDomain> = Object.fromEntries(
  CULTURAL_DOMAINS.map((domain) => [domain.code, domain])
);

/** Resolve a stored `taxonomyDomainId` value (`CT-xx`) to its domain. */
export const getCulturalDomainByCode = (code?: string | null): CulturalDomain | undefined => {
  const normalized = code?.trim();
  return normalized ? CULTURAL_DOMAINS_BY_CODE[normalized] : undefined;
};
