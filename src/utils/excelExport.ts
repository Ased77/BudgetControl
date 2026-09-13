import { CsrPriority, OrganizationConfig } from '../types';

export function exportToCsv(
  orgConfig: OrganizationConfig,
  priorities: CsrPriority[],
  currentPercentages: Record<string, number>,
  totalBudgetToman: number
) {
  // UTF-8 BOM for Excel Persian compatibility
  let csvContent = '\uFEFF';

  // Header info
  csvContent += `گزارش تخصیص بودجه مسئولیت اجتماعی (CSR)\n`;
  csvContent += `نام شرکت/نهاد,${orgConfig.name}\n`;
  csvContent += `نوع سازمان,${orgConfig.orgType}\n`;
  csvContent += `منطقه هدف,${orgConfig.province} - ${orgConfig.county} - ${orgConfig.district}\n`;
  csvContent += `بودجه کل مصوب (تومان),${totalBudgetToman}\n`;
  csvContent += `دوره مالی,${orgConfig.fiscalYear}\n`;
  csvContent += `تاریخ دریافت گزارش,${new Date().toLocaleDateString('fa-IR')}\n\n`;

  // Columns
  csvContent += `کد,عنوان اولویت محلی,دسته‌بندی,درصد تخصیص یافته,مبلغ تخصیصی (تومان),مبلغ تخصیصی (ریال),شرح اولویت\n`;

  let totalAllocatedToman = 0;
  let totalPercent = 0;

  priorities.forEach((p) => {
    const pct = currentPercentages[p.id] || 0;
    const amountToman = Math.round(totalBudgetToman * (pct / 100));
    const amountRial = amountToman * 10;
    totalAllocatedToman += amountToman;
    totalPercent += pct;

    const cleanTitle = p.title.replace(/,/g, ' ');
    const cleanDesc = p.description.replace(/,/g, ' ');

    csvContent += `${p.code},"${cleanTitle}",${p.category},${pct}%,${amountToman},${amountRial},"${cleanDesc}"\n`;
  });

  csvContent += `,,مجموع,${Math.round(totalPercent * 10) / 10}%,${totalAllocatedToman},${totalAllocatedToman * 10},"توزیع کامل بودجه"\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `گزارش_تخصیص_بودجه_CSR_${orgConfig.province}_${orgConfig.county}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
