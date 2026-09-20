/**
 * @license
 * موتور هوشمند تشخیص موازی‌کاری، تحلیل بهره‌وری سرانه و بهینه‌سازی پروژه‌ها
 * National Anti-Duplication & Project Optimization Engine
 */

import { ExecutiveProject, CrisisHarmItem, BudgetSource, AntiDuplicationAlert } from '../types';
import { toPersianDigits } from './numberUtils';

export interface OptimizationMetrics {
  totalProjects: number;
  duplicateAlertsCount: number;
  inefficientPerCapitaCount: number;
  unprioritizedCount: number;
  preventedWastedBudgetToman: number;
  averageBeneficiariesPerProject: number;
  averageCostPerBeneficiaryToman: number;
}

/**
 * بررسی هوشمند تداخل و موازی‌کاری میان پروژه‌ها
 */
export function analyzeProjectDuplicatesAndEfficiency(
  projects: ExecutiveProject[],
  crises: CrisisHarmItem[],
  budgetSources: BudgetSource[]
): {
  evaluatedProjects: ExecutiveProject[];
  alerts: AntiDuplicationAlert[];
  metrics: OptimizationMetrics;
} {
  const alerts: AntiDuplicationAlert[] = [];
  let duplicateCount = 0;
  let inefficientCount = 0;
  let unprioritizedCount = 0;
  let preventedWasteToman = 0;

  // 1. ارزیابی سرانه و بررسی تداخلات مکانی و موضوعی
  const evaluatedProjects: ExecutiveProject[] = projects.map((project, index) => {
    let status: ExecutiveProject['antiOverlapStatus'] = 'CLEAR';
    let warningReason: string | undefined = undefined;

    // محاسبات سرانه هزینه به ازای هر ذینفع
    const beneficiaries = Math.max(1, project.beneficiariesCount);
    const costPerBeneficiary = Math.round(project.estimatedCostToman / beneficiaries);

    // قاعده ۱: شناسایی موازی‌کاری مستقیم با پروژه‌های دیگر
    // اگر پروژه دیگری در همان منطقه (شهرستان/بخش/روستا) با همان اولویت یا دسته وجود داشته باشد
    const duplicateCandidate = projects.find(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.id !== project.id &&
        other.province === project.province &&
        other.county === project.county &&
        (other.district.toLowerCase() === project.district.toLowerCase() ||
         other.targetArea.toLowerCase() === project.targetArea.toLowerCase()) &&
        (other.priorityId === project.priorityId ||
         (other.title.includes('آب') && project.title.includes('آب')) ||
         (other.title.includes('راه') && project.title.includes('راه')) ||
         (other.title.includes('مدرسه') && project.title.includes('مدرسه')))
    );

    if (duplicateCandidate) {
      status = 'POTENTIAL_DUPLICATE';
      warningReason = `همپوشانی و موازی‌کاری احتمالی با پروژه «${duplicateCandidate.title}» (متولی: ${duplicateCandidate.departmentName} - منبع: ${duplicateCandidate.budgetSourceName}). هر دو در یک محدوده هدف با کارکرد مشابه تعریف شده‌اند.`;
      duplicateCount++;
      preventedWasteToman += Math.min(project.estimatedCostToman, duplicateCandidate.estimatedCostToman);

      // ایجاد هشدار جامع
      if (!alerts.some(a => a.affectedProjectIds.includes(project.id) && a.affectedProjectIds.includes(duplicateCandidate.id))) {
        alerts.push({
          id: `alert-dup-${project.id}-${duplicateCandidate.id}`,
          type: 'DUPLICATE_SCOPE',
          severity: 'CRITICAL',
          title: `هشدار موازی‌کاری بین دو دستگاه اجرایی در محدوده ${project.targetArea}`,
          description: `پروژه «${project.title}» تعریف‌شده توسط ${project.departmentName} و پروژه «${duplicateCandidate.title}» توسط ${duplicateCandidate.departmentName} دارای همپوشانی هدف و مکان هستند. ادغام این دو پروژه از هدررفت بودجه جلوگیری می‌کند.`,
          affectedProjectIds: [project.id, duplicateCandidate.id],
          affectedLocation: `${project.county} - ${project.targetArea}`,
          suggestedAction: 'ادغام دو پروژه در یک پیمان مشترک و بازتخصیص مازاد بودجه به مناطق فاقد طرح',
        });
      }
    }

    // قاعده ۲: عدم تناسب هزینه با تعداد بهره‌برداران (سرانه غیرمتعارف)
    // مثلاً بیش از ۵۰ میلیون تومان به ازای هر نفر برای یک پروژه عمومی یا کمتر از ۳۰ نفر برای پروژه‌ای میلیاردی
    else if (costPerBeneficiary > 40_000_000 && project.estimatedCostToman > 500_000_000 && beneficiaries < 100) {
      status = 'INEFFICIENT_PER_CAPITA';
      warningReason = `عدم تناسب جمعیتی: هزینه بسیار سنگین (${toPersianDigits((project.estimatedCostToman / 1_000_000_000).toFixed(1))} میلیارد تومان) صرفاً برای ${toPersianDigits(beneficiaries)} نفر بهره‌بردار (سرانه بیش از ${toPersianDigits((costPerBeneficiary / 1_000_000).toFixed(1))} میلیون تومان به ازای هر نفر).`;
      inefficientCount++;

      alerts.push({
        id: `alert-eff-${project.id}`,
        type: 'EXCESSIVE_PER_CAPITA',
        severity: 'WARNING',
        title: `هزینه غیرمتعارف سرانه در پروژه «${project.title}»`,
        description: `تخصیص بودجه کلان با جامعه هدف بسیار محدود همخوانی ندارد. بازنگری در ابعاد طرح یا انتقال به نقطه پرجمعیت‌تر توصیه می‌شود.`,
        affectedProjectIds: [project.id],
        affectedLocation: project.targetArea,
        suggestedAction: 'کاهش مقیاس پروژه یا تلفیق با نیازهای روستاهای اقماری همجوار',
      });
    }

    // قاعده ۳: عدم همخوانی با اولویت‌ها و بحران‌های منطقه
    // اگر در منطقه‌ای بحران تنش آبی یا سلامت حاد وجود دارد اما پروژه در حوزه تشریفاتی/غیرضروری تعریف شده باشد
    const localCrisis = crises.find(
      c => c.province === project.province && c.county === project.county && c.urgency === 'CRITICAL' && c.status === 'UNRESOLVED'
    );
    if (localCrisis && (project.priorityId === 'p7' || project.priorityId === 'p8') && project.estimatedCostToman > 1_000_000_000) {
      if (status === 'CLEAR') {
        status = 'UNPRIORITIZED';
        warningReason = `عدم اولویت‌سنجی: در حالی که در این منطقه بحران حاد «${localCrisis.title}» حل‌نشده باقی مانده، بودجه سنگینی به فعالیت‌های غیرفوری اختصاص یافته است.`;
        unprioritizedCount++;

        alerts.push({
          id: `alert-unp-${project.id}`,
          type: 'MISALIGNED_PRIORITY',
          severity: 'WARNING',
          title: `انحراف اولویت در تخصیص بودجه منطقه ${project.county}`,
          description: `پروژه «${project.title}» در اولویت پایین‌تری نسبت به بحران حاد «${localCrisis.title}» قرار دارد.`,
          affectedProjectIds: [project.id],
          affectedLocation: project.targetArea,
          suggestedAction: 'انتقال اولویت تأمین مالی به حل تنش‌های اساسی تا مهار بحران اولیه',
        });
      }
    }

    return {
      ...project,
      costPerBeneficiaryToman: costPerBeneficiary,
      antiOverlapStatus: status,
      overlapWarningDetails: warningReason,
    };
  });

  // محاسبه شاخص‌های کلی
  const totalBeneficiaries = evaluatedProjects.reduce((sum, p) => sum + p.beneficiariesCount, 0);
  const totalCost = evaluatedProjects.reduce((sum, p) => sum + p.estimatedCostToman, 0);

  const metrics: OptimizationMetrics = {
    totalProjects: evaluatedProjects.length,
    duplicateAlertsCount: duplicateCount,
    inefficientPerCapitaCount: inefficientCount,
    unprioritizedCount,
    preventedWastedBudgetToman: preventedWasteToman,
    averageBeneficiariesPerProject: evaluatedProjects.length > 0 ? Math.round(totalBeneficiaries / evaluatedProjects.length) : 0,
    averageCostPerBeneficiaryToman: totalBeneficiaries > 0 ? Math.round(totalCost / totalBeneficiaries) : 0,
  };

  return {
    evaluatedProjects,
    alerts,
    metrics,
  };
}
