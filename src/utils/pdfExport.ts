import { CsrPriority, OrganizationConfig, LocalIndicators } from '../types';
import { formatCurrency, formatLargeBudgetPersian, toPersianDigits } from './numberUtils';

export function triggerPrintPdf(
  orgConfig: OrganizationConfig,
  priorities: CsrPriority[],
  currentPercentages: Record<string, number>,
  indicators: LocalIndicators,
  smartRationale?: string
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('لطفا اجازه باز شدن پاپ‌آپ (Pop-up) را در مرورگر بدهید.');
    return;
  }

  const totalBudget = orgConfig.totalBudget;
  const dateStr = new Date().toLocaleDateString('fa-IR');

  let tableRowsHtml = '';
  let sumPct = 0;
  let sumAmount = 0;

  priorities.forEach((p, index) => {
    const pct = currentPercentages[p.id] || 0;
    const amountToman = Math.round(totalBudget * (pct / 100));
    sumPct += pct;
    sumAmount += amountToman;

    tableRowsHtml += `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; text-align: center;">${toPersianDigits(index + 1)}</td>
        <td style="padding: 10px; font-weight: bold;">${p.title}</td>
        <td style="padding: 10px; color: #4b5563;">${p.category}</td>
        <td style="padding: 10px; text-align: center; font-weight: bold; color: #1e40af;">${toPersianDigits(pct)}٪</td>
        <td style="padding: 10px; text-align: left; font-weight: bold; dir: ltr;">${formatCurrency(amountToman, 'TOMAN', true)}</td>
        <td style="padding: 10px; text-align: left; color: #6b7280; font-size: 11px; dir: ltr;">${formatCurrency(amountToman, 'RIAL', true)}</td>
      </tr>
    `;
  });

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <title>گزارش رسمی تخصیص بودجه مسئولیت اجتماعی (CSR)</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;600;700;800&display=swap');
        body {
          font-family: 'Vazirmatn', sans-serif;
          margin: 0;
          padding: 24px;
          color: #1f2937;
          background: #ffffff;
          line-height: 1.6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .title {
          font-size: 20px;
          font-weight: 800;
          color: #1e3a8a;
        }
        .subtitle {
          font-size: 13px;
          color: #6b7280;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
          font-size: 13px;
        }
        .info-item span {
          color: #64748b;
          display: block;
          font-size: 11px;
        }
        .info-item strong {
          color: #0f172a;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 13px;
        }
        th {
          background-color: #1e3a8a;
          color: white;
          padding: 10px;
          text-align: right;
          font-weight: 600;
        }
        .summary-box {
          background-color: #eff6ff;
          border-right: 4px solid #2563eb;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          font-size: 13px;
        }
        .signature-area {
          margin-top: 48px;
          display: flex;
          justify-content: space-between;
          text-align: center;
          font-size: 12px;
        }
        .sig-box {
          border-top: 1px dashed #9ca3af;
          width: 28%;
          padding-top: 8px;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">سامانه هوشمند تخصیص بودجه مسئولیت اجتماعی (CSR)</div>
          <div class="subtitle">گزارش رسمی تخصیص اعتبارات محلی و توزیع اولویت‌ها</div>
        </div>
        <div style="text-align: left; font-size: 12px; color: #4b5563;">
          <div>تاریخ صدور: ${toPersianDigits(dateStr)}</div>
          <div>کد سند: CSR-${Math.floor(100000 + Math.random() * 900000)}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <span>نام شرکت/سازمان:</span>
          <strong>${orgConfig.name}</strong>
        </div>
        <div class="info-item">
          <span>منطقه و لوکیشن هدف:</span>
          <strong>${orgConfig.province} - ${orgConfig.county} (${orgConfig.district})</strong>
        </div>
        <div class="info-item">
          <span>بودجه کل CSR مصوب:</span>
          <strong>${formatLargeBudgetPersian(totalBudget)}</strong>
        </div>
        <div class="info-item">
          <span>سال/دوره مالی:</span>
          <strong>${orgConfig.fiscalYear}</strong>
        </div>
        <div class="info-item">
          <span>نوع سازمان:</span>
          <strong>${orgConfig.orgType === 'PUBLIC' ? 'عمومی/دولتی' : 'خصوصی'}</strong>
        </div>
        <div class="info-item">
          <span>حوزه فعالیت:</span>
          <strong>${orgConfig.activitySector}</strong>
        </div>
      </div>

      ${smartRationale ? `
        <div class="summary-box">
          <strong style="color: #1e40af; display: block; margin-bottom: 4px;">مبنا و استدلال تخصیص هوشمند (تحلیل شاخص‌های محلی):</strong>
          ${smartRationale}
        </div>
      ` : ''}

      <table>
        <thead>
          <tr>
            <th style="width: 5%; text-align: center;">#</th>
            <th style="width: 30%;">عنوان اولویت مسئولیت اجتماعی</th>
            <th style="width: 20%;">دسته موضوعی</th>
            <th style="width: 15%; text-align: center;">سهم درصدی</th>
            <th style="width: 15%; text-align: left;">مبلغ تخصیصی (تومان)</th>
            <th style="width: 15%; text-align: left;">مبلغ تخصیصی (ریال)</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
          <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
            <td colspan="3" style="padding: 12px; text-align: left;">جمع کل تخصیص‌ها:</td>
            <td style="padding: 12px; text-align: center; color: #166534;">${toPersianDigits(Math.round(sumPct * 10) / 10)}٪</td>
            <td style="padding: 12px; text-align: left; color: #166534; dir: ltr;">${formatCurrency(sumAmount, 'TOMAN', true)}</td>
            <td style="padding: 12px; text-align: left; color: #475569; font-size: 11px; dir: ltr;">${formatCurrency(sumAmount, 'RIAL', true)}</td>
          </tr>
        </tbody>
      </table>

      <div class="signature-area">
        <div class="sig-box">
          <strong>مدیر کل مسئولیت اجتماعی</strong><br>
          امضاء و مهر سازمان
        </div>
        <div class="sig-box">
          <strong>کارشناس برنامه‌ریزی و بودجه</strong><br>
          تایید فنی و مالی
        </div>
        <div class="sig-box">
          <strong>نماینده شورای راهبری محلی</strong><br>
          تایید اولویت‌های منطقه
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
