/**
 * @license
 * سامانه جامع و ملی مدیریت هوشمند توسعه روستایی و شهری
 * تعریف تایپ‌ها، مدل داده‌های یکپارچه و ساختار مهندسی نرم‌افزار
 */

export type UserRole = 
  | 'ADMIN'                 // مدیر ارشد کشوری / ملی
  | 'PROVINCIAL_GOVERNOR'   // استاندار / فرماندار
  | 'DEPARTMENT_HEAD'       // مدیر اداره / دستگاه اجرایی
  | 'REGIONAL_MANAGER'      // مدیر منطقه‌ای و توسعه روستایی
  | 'PLANNING_SPECIALIST'   // کارشناس ارشد برنامه‌ریزی و بودجه
  | 'AUDITOR'               // حسابرس و ناظر عالی شفافیت
  | 'DEHYAR_COUNCIL';       // دهیار / نماینده شورای اسلامی

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  /** Short role name (e.g. "مدیر اداره") for compact badges and pills. */
  roleFa: string;
  /** Full formal job title of the person. */
  roleTitleFa: string;
  avatar: string;
  organization: string;
  departmentId?: string;
  allowedLocationId?: string;
}

export type OrgType = 'GOVERNMENT' | 'PUBLIC' | 'PRIVATE' | 'SEMI_PRIVATE' | 'COOPERATIVE';
export type BudgetPeriod = '1_YEAR' | '3_YEARS' | '5_YEARS';
export type CurrencyUnit = 'TOMAN' | 'RIAL';
export type AdministrativeLevel = 'NATIONAL' | 'PROVINCIAL' | 'COUNTY' | 'RURAL_DISTRICT';

export interface OrganizationConfig {
  id: string;
  name: string;
  orgType: OrgType;
  activitySector: string;
  nationalCode?: string;
  province: string;
  city: string;
  county: string;
  district: string;
  totalBudget: number; // in Toman
  currencyUnit: CurrencyUnit;
  budgetPeriod: BudgetPeriod;
  fiscalYear: string;
  description?: string;
  updatedAt: string;
}

/* =========================================================================
   ۱. مدل ادارات و نهادهای متولی (Departments & Agencies)
   ========================================================================= */
export interface Department {
  id: string;
  name: string;
  code: string;
  category: 'INFRASTRUCTURE' | 'HEALTH' | 'EDUCATION' | 'SOCIAL_WELFARE' | 'AGRICULTURE' | 'ENVIRONMENT' | 'MUNICIPAL_RURAL';
  categoryFa: string;
  headPersonName: string;
  contactNumber: string;
  email?: string;
  allocatedBudgetToman: number;
  absorbedBudgetToman: number;
  activeProjectsCount: number;
  performanceScore: number; // 0 - 100
  administrativeLevel: AdministrativeLevel;
  province: string;
  county?: string;
  description: string;
}

/* =========================================================================
   ۲. مدل بودجه و منابع مالی چندگانه (Budget Sources)
   ========================================================================= */
export type BudgetSourceType = 
  | 'CSR'                   // مسئولیت اجتماعی شرکتی / صنایع
  | 'GOVERNMENT'            // اعتبارات دولتی و تملک دارایی سرمایه‌ای
  | 'DEHYARI_MUNICIPALITY'  // اعتبارات دهیاری‌ها و شهرداری‌ها
  | 'CHARITY_FOUNDATION'    // خیریه‌ها، موقوفات و بنیادهای حمایتی
  | 'BANK_FACILITY'         // تسهیلات بانکی و تبصره‌های اشتغال‌زایی
  | 'PUBLIC_PARTICIPATION'; // خودیاری و مشارکت‌های مردمی

export interface BudgetSource {
  id: string;
  title: string;
  code: string;
  sourceType: BudgetSourceType;
  sourceTypeFa: string;
  totalAmountToman: number;
  allocatedAmountToman: number;
  remainingAmountToman: number;
  fiscalYear: string;
  sponsorOrganization: string;
  targetScope: string; // e.g. "کل شهرستان"، "مناطق روستایی محروم"
  restrictionNote?: string;
  status: 'ACTIVE' | 'DEPLETED' | 'RESERVED';
}

/* =========================================================================
   ۳. مدل آسیب‌ها، بحران‌ها و نیازسنجی (Harms, Crises & Local Needs)
   ========================================================================= */
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CrisisHarmItem {
  id: string;
  title: string;
  code: string;
  category: string;
  level: AdministrativeLevel;
  province: string;
  county: string;
  districtOrVillage: string;
  severityScore: number; // 0 - 100
  urgency: UrgencyLevel;
  affectedPopulation: number;
  primaryCause: string;
  recommendedIntervention: string;
  status: 'UNRESOLVED' | 'UNDER_INTERVENTION' | 'CONTROLLED';
  activeProjectsCount: number;
  deficitIndexFa: string; // e.g. "بحران حاد تنش آبی", "کمبود تخت درمانی"
}

/* =========================================================================
   ۴. مدل اولویت‌های توسعه و ماتریس تخصیص (Priorities)
   ========================================================================= */
export interface CsrPriority {
  id: string;
  code: number;
  title: string;
  description: string;
  category: string;
  defaultPercentage: number;
  currentPercentage: number;
  recommendedPercentage?: number;
  isLocked?: boolean;
  isActive: boolean;
  relatedIndicators: string[];
  iconName: string;
  weightFactor?: number;
  minPercent?: number;
  maxPercent?: number;
  subItems?: string[];
}

export interface PriorityAllocation {
  priorityId: string;
  title: string;
  percentage: number;
  amountToman: number;
  amountRial: number;
  locked: boolean;
  smartPercentage: number;
  variancePercentage: number;
}

/* =========================================================================
   ۵. مدل مجریان پروژه‌ها (Project Executors)
   ========================================================================= */
export type ExecutorType = 
  | 'GOVERNMENTAL'          // دستگاه دولتی / استانی
  | 'JIHADI_FOUNDATION'     // قرارگاه‌های جهادی و محرومیت‌زدایی
  | 'PUBLIC_COMMUNITY'      // بخشداری و شورای دهیاری
  | 'NGO'                   // سازمان مردم‌نهاد / انجمن خیریه
  | 'COOPERATIVE'           // شرکت تعاونی توسعه روستایی
  | 'PRIVATE';              // شرکت مجری خصوصی

export interface ProjectExecutor {
  id: string;
  name: string;
  code: string;
  type: ExecutorType;
  typeFa: string;
  managingDirector: string;
  contactPhone: string;
  activeProjectsCount: number;
  completedProjectsCount: number;
  successRate: number; // 0 - 100
  capacityStatus: 'AVAILABLE' | 'OPTIMAL' | 'OVERLOADED';
  coverageRegion: string;
}

/* =========================================================================
   ۶. مدل پیمانکاران (Contractors)
   ========================================================================= */
export type ContractorGrade = 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'GRADE_4' | 'GRADE_5' | 'LOCAL_AUTHORIZED';

export interface Contractor {
  id: string;
  companyName: string;
  ceoName: string;
  nationalId: string;
  grade: ContractorGrade;
  gradeFa: string;
  specialtyField: string; // e.g. "راه و ابنیه", "آب و فاضلاب", "تجهیزات پزشکی"
  activeContractsCount: number;
  totalContractValueToman: number;
  performanceScore: number; // 0 - 100
  satisfactionRating: number; // 1 - 5 stars
  freeCapacitySlots: number;
  phone: string;
  status: 'VERIFIED' | 'UNDER_EVALUATION' | 'SUSPENDED';
}

/* =========================================================================
   ۷. مدل جامع پروژه‌ها و پایش موازی‌کاری (Executive Projects)
   ========================================================================= */
export type ProjectStatus = 'PROPOSED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED';

export interface ContributingDepartment {
  departmentId: string;
  departmentName: string;
  sharePercentage: number;
  shareAmountToman: number;
  roleDescription?: string;
}

export interface ExecutiveProject {
  id: string;
  code: string;
  title: string;
  priorityId: string;
  priorityTitle: string;
  departmentId: string;       // نهاد / اداره متولی اصلی
  departmentName: string;
  requestingDepartmentId?: string; // اداره درخواست‌دهنده / متقاضی اولیه
  requestingDepartmentName?: string;
  isMultiDepartment?: boolean; // آیا پروژه اشتراکی و بین‌دستگاهی است؟
  contributingDepartments?: ContributingDepartment[]; // سهم ادارات همکار
  budgetSourceId: string;     // منبع تأمین بودجه
  budgetSourceName: string;
  executorId: string;         // مجری پروژه
  executorName: string;
  contractorId?: string;      // پیمانکار پروژه
  contractorName?: string;
  crisisHarmId?: string;      // آسیب / بحران متناظر
  crisisHarmTitle?: string;
  urgencyLevel?: UrgencyLevel;
  
  // موقعیت جغرافیایی چندسطحی
  administrativeLevel: AdministrativeLevel;
  province: string;
  county: string;
  district: string;
  targetArea: string;

  estimatedCostToman: number;
  currentYearAllocatedToman?: number;
  futureYearsAllocatedToman?: number;
  
  // سهام منابع مالی
  csrSharePercentage?: number;
  governmentSharePercentage?: number;
  charitySharePercentage?: number;
  dehyariSharePercentage?: number;
  bankFacilitySharePercentage?: number;

  // تحلیل بهره‌وری و جامعه هدف
  beneficiariesCount: number;
  costPerBeneficiaryToman: number; // نسبت هزینه به جمعیت بهره‌بردار
  targetBeneficiaryGroups?: string[]; // گروه‌های هدف (مددجویان کمیته امداد، بهزیستی، روستاییان، جوانان و...)
  
  // پایش هوشمند موازی‌کاری و آسیب‌شناسی
  antiOverlapStatus: 'CLEAR' | 'POTENTIAL_DUPLICATE' | 'INEFFICIENT_PER_CAPITA' | 'UNPRIORITIZED';
  overlapWarningDetails?: string;

  status: ProjectStatus;
  startYear: number;
  endYear: number;
  durationMonths: number;
  progressPercentage: number;
  description: string;
}

/* =========================================================================
   ۸. هشدارهای سیستم ردیاب موازی‌کاری و اتلاف بودجه (Anti-Duplication Alerts)
   ========================================================================= */
export interface AntiDuplicationAlert {
  id: string;
  type: 'DUPLICATE_SCOPE' | 'EXCESSIVE_PER_CAPITA' | 'MISALIGNED_PRIORITY' | 'BUDGET_OVER_ALLOCATED';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  affectedProjectIds: string[];
  affectedLocation: string;
  suggestedAction: string;
}

/* =========================================================================
   ۹. مدل نقش‌ها و ماتریس دسترسی‌ها (Roles & Access Matrix)
   ========================================================================= */
export interface SystemRolePermission {
  role: UserRole;
  roleTitleFa: string;
  description: string;
  canViewDashboard: boolean;
  canEditDepartments: boolean;
  canManageBudget: boolean;
  canManageCrises: boolean;
  canManagePriorities: boolean;
  canApproveProjects: boolean;
  canManageExecutors: boolean;
  canManageContractors: boolean;
  canExportReports: boolean;
  canAuditLogs: boolean;
  scopeLevel: AdministrativeLevel;
}

/* =========================================================================
   ۱۰. مدل لاگ‌های ممیزی و رویدادهای زنده (Audit Logs)
   ========================================================================= */
export type AuditActionType = 
  | 'PERCENTAGE_CHANGE'
  | 'BUDGET_UPDATE'
  | 'PRIORITY_ADD'
  | 'PRIORITY_EDIT'
  | 'PRIORITY_DELETE'
  | 'PROJECT_ADD'
  | 'PROJECT_EDIT'
  | 'PROJECT_DELETE'
  | 'PROJECT_STATUS_CHANGE'
  | 'DEPARTMENT_ADD'
  | 'DEPARTMENT_EDIT'
  | 'DEPARTMENT_DELETE'
  | 'BUDGET_SOURCE_ADD'
  | 'BUDGET_SOURCE_EDIT'
  | 'BUDGET_SOURCE_DELETE'
  | 'CRISIS_ADD'
  | 'CRISIS_EDIT'
  | 'CRISIS_DELETE'
  | 'EXECUTOR_ADD'
  | 'EXECUTOR_EDIT'
  | 'EXECUTOR_DELETE'
  | 'CONTRACTOR_ADD'
  | 'CONTRACTOR_EDIT'
  | 'CONTRACTOR_DELETE'
  | 'SCENARIO_APPLIED'
  | 'EXPORT_REPORT'
  | 'LOCATION_CHANGE'
  | 'DUPLICATE_FLAGGED'
  | 'LOGIN'
  | 'LOGOUT';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  actionType: AuditActionType;
  targetPriorityTitle?: string;
  oldValue?: string;
  newValue?: string;
  rationale?: string;
}

/* =========================================================================
   شاخص‌های محلی، سناریوها و موتور پیشنهاد هوشمند
   ========================================================================= */
export interface LocalIndicators {
  povertyRate: number; // Percentage 0-100
  marginalizationRate: number; // Informal settlements percentage
  unemploymentRate: number; // Percentage
  socialHarmsIndex: number; // Score 0-100
  vulnerableGroupsPopulation: number;
  infrastructureDeficit: number; // Score 0-100
  crisisVulnerabilityScore: number; // Score 0-100
  healthAccessDeficit: number; // Score 0-100
  educationDropOutRate: number; // Score 0-100
  culturalDeficitScore: number; // Score 0-100
  environmentalRiskScore: number; // Score 0-100
}

export interface LocationData {
  id: string;
  level: AdministrativeLevel;
  province: string;
  county: string;
  city: string;
  district: string;
  population: number;
  indicators: LocalIndicators;
  coordinates?: { lat: number; lng: number };
}

export interface PrevalenceDimension {
  metricName: string;
  national: number;
  provincial: number;
  county: number;
  local: number;
  unit: string;
  benchmarkSource: string;
  locationQuotient: number;
  prevalenceTier: 'UNIVERSAL_CRITICAL' | 'LOCAL_HOTSPOT' | 'PROVINCIAL_HIGH' | 'NORMAL';
  tierLabelFa: string;
  divergenceDescription: string;
}

export interface SmartRecommendationResult {
  scores: Record<string, number>;
  explainability: Record<string, {
    score: number;
    primaryDriver: string;
    rationale: string;
    keyMetrics: Array<{ label: string; value: string | number }>;
    prevalence?: PrevalenceDimension;
    isLocalHotspot?: boolean;
    isUniversalSevere?: boolean;
  }>;
  summaryRationale: string;
  overallVulnerabilityIndex: number;
  universalCriticalCount?: number;
  localHotspotCount?: number;
}
