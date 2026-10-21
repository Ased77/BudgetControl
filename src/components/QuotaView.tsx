import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { formatNumber, formatMoneyParts, formatPercent, toPersianDigits } from '../utils/numberUtils';
import { Num } from './Num';
import { PageHeader } from './PageHeader';
import { HelpTooltip } from './HelpTooltip';
import {
  Percent,
  Users,
  MapPin,
  Building2,
  Search,
  Download,
  Info,
  ChevronRight,
} from 'lucide-react';

/**
 * سهمیه — budget share by population.
 *
 * The allocation criterion is population: every county's share of the
 * organization's total budget equals its share of the country's registered
 * population. All figures come from the location registry (`locations`) and
 * the organization config (`orgConfig`), both hydrated from PostgreSQL on
 * load (see AppContext) — nothing on this page is hard-coded.
 *
 * Aggregation rules (mirroring PopulationView's county semantics):
 *  - A "county" is the unique `county` name; its population is the LARGEST
 *    row under it, which picks the county-wide aggregate row where one
 *    exists and keeps بخش/دهستان rows from double counting.
 *  - A province sums the populations of its counties.
 *  - quota = totalBudget × (county population ÷ total population).
 */

interface CountyRow {
  id: string;
  province: string;
  county: string;
  population: number;
  /** Percent of the country's population (3 decimal precision in state). */
  sharePercent: number;
  /** Budget quota in Toman, rounded to the nearest Toman. */
  quotaToman: number;
}

interface ProvinceRow {
  province: string;
  counties: number;
  population: number;
  sharePercent: number;
  quotaToman: number;
}

type ViewMode = 'PROVINCES' | 'COUNTIES';

export const QuotaView: React.FC = () => {
  const { locations, orgConfig, selectedLocation, handleSelectLocation } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('PROVINCES');
  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');

  const totalBudget = orgConfig.totalBudget;

  // --- County roll-up: one row per unique county, aggregate row wins --------
  const countyRows = useMemo<CountyRow[]>(() => {
    const byCounty = new Map<string, { id: string; province: string; county: string; population: number }>();
    for (const loc of locations) {
      const prev = byCounty.get(loc.county);
      if (!prev || loc.population > prev.population) {
        byCounty.set(loc.county, { id: loc.id, province: loc.province, county: loc.county, population: loc.population });
      }
    }
    const rows = Array.from(byCounty.values());
    const totalPopulation = rows.reduce((sum, r) => sum + r.population, 0);
    return rows
      .map((r) => ({
        ...r,
        sharePercent: totalPopulation ? (r.population / totalPopulation) * 100 : 0,
        // جمع عمومی سهمیه‌ها ۱۰۰٪ بودجه را می‌پوشاند؛ کسری گردکردن در کارت
        // جمعی نمایش داده می‌شود، نه در هر ستون.
        quotaToman: Math.round(totalPopulation ? (totalBudget * r.population) / totalPopulation : 0),
      }))
      .sort((a, b) => b.population - a.population);
  }, [locations, totalBudget]);

  // --- Province roll-up -----------------------------------------------------
  const provinceRows = useMemo<ProvinceRow[]>(() => {
    const byProvince = new Map<string, { counties: number; population: number }>();
    for (const r of countyRows) {
      const prev = byProvince.get(r.province) ?? { counties: 0, population: 0 };
      byProvince.set(r.province, { counties: prev.counties + 1, population: prev.population + r.population });
    }
    const totalPopulation = Array.from(byProvince.values()).reduce((sum, p) => sum + p.population, 0);
    return Array.from(byProvince.entries())
      .map(([province, agg]) => ({
        province,
        counties: agg.counties,
        population: agg.population,
        sharePercent: totalPopulation ? (agg.population / totalPopulation) * 100 : 0,
        quotaToman: Math.round(totalPopulation ? (totalBudget * agg.population) / totalPopulation : 0),
      }))
      .sort((a, b) => b.population - a.population);
  }, [countyRows, totalBudget]);

  const nationalPopulation = useMemo(
    () => provinceRows.reduce((sum, p) => sum + p.population, 0),
    [provinceRows]
  );
  const perCapitaToman = nationalPopulation > 0 ? Math.round(totalBudget / nationalPopulation) : 0;
  // کسری/فزونی گردکردن سهمیه‌ها نسبت به بودجه کل (باید نزدیک صفر باشد).
  const quotaSumDrift = useMemo(
    () => totalBudget - countyRows.reduce((sum, r) => sum + r.quotaToman, 0),
    [countyRows, totalBudget]
  );

  // --- Filtering -------------------------------------------------------------
  const normalizedSearch = search.trim();
  const filteredCounties = useMemo(() => {
    let rows = countyRows;
    if (provinceFilter !== 'ALL') rows = rows.filter((r) => r.province === provinceFilter);
    if (normalizedSearch) {
      rows = rows.filter(
        (r) => r.county.includes(normalizedSearch) || r.province.includes(normalizedSearch)
      );
    }
    return rows;
  }, [countyRows, normalizedSearch, provinceFilter]);

  const filteredProvinces = useMemo(() => {
    if (!normalizedSearch) return provinceRows;
    return provinceRows.filter((p) => p.province.includes(normalizedSearch));
  }, [provinceRows, normalizedSearch]);

  // Bars are normalized to the current filtered list so a 0.05٪ county is
  // still a visible sliver; the printed number stays the true share.
  const maxCountyShare = filteredCounties[0]?.sharePercent ?? 0;
  const maxProvinceShare = filteredProvinces[0]?.sharePercent ?? 0;

  // --- CSV export (same BOM convention as utils/excelExport.ts) --------------
  const exportCsv = () => {
    const bom = '\uFEFF';
    const lines: string[] = [];
    lines.push('گزارش سهمیه‌بندی بودجه بر مبنای جمعیت');
    lines.push(`نام شرکت/نهاد,${orgConfig.name}`);
    lines.push(`بودجه کل مصوب (تومان),${toPersianDigits(totalBudget)}`);
    lines.push(`دوره مالی,${orgConfig.fiscalYear}`);
    lines.push(`تاریخ دریافت گزارش,${new Date().toLocaleDateString('fa-IR')}`);
    lines.push('');
    lines.push('رتبه,استان,شهرستان,جمعیت,درصد سهم جمعیتی,سهمیه بودجه (تومان),سهمیه بودجه (ریال)');
    countyRows.forEach((r, idx) => {
      lines.push(
        `${toPersianDigits(idx + 1)},${r.province},${r.county},${toPersianDigits(r.population)},${toPersianDigits(r.sharePercent.toFixed(2))}٪,${toPersianDigits(r.quotaToman)},${toPersianDigits(r.quotaToman * 10)}`
      );
    });
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quota-${orgConfig.fiscalYear || '1404'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="quota-view-root" className="space-y-6">
      {/* Page title block */}
      <PageHeader
        id="quota-view-page-header"
        icon={Percent}
        title="سهمیه بودجه بر مبنای جمعیت"
        subtitle="سهم استانی و شهرستانی از کل بودجه، به‌تناسب جمعیت رسمی کشور — مبنای تخصیص، جمعیت است"
        tone="text-emerald-600"
        adornment={
          <HelpTooltip
            text={`فرمول سهمیه: (جمعیت شهرستان ÷ جمع کل کشور) × بودجه مصوب ${formatMoneyParts(totalBudget).value} ${formatMoneyParts(totalBudget).unit}. جمعیت هر شهرستان از رجیستری مکان‌های پایگاه داده (لحظه‌ای از آخرین به‌روزرسانی) خوانده می‌شود و سهم هر ردیف مستقیماً از جمع واقعی رکورد محاسبه می‌گردد.`}
            label="فرمول و مبنای داده"
            widthClassName="w-80"
          />
        }
      >
        <button
          id="quota-view-export-csv-button"
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          خروجی CSV
        </button>
      </PageHeader>

      {/* KPI banner */}
      <div id="quota-view-header-banner" className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
        <div id="quota-view-4-core-kpi-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div id="quota-view-kpi-budget" className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-1">بودجه کل مصوب سهمیه‌بندی</span>
            <Num
              value={`${formatMoneyParts(totalBudget).value} ${formatMoneyParts(totalBudget).unit}`}
              className="text-2xl md:text-3xl font-black text-slate-900 font-mono block"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              سرانه هر نفر: <Num value={formatMoneyParts(perCapitaToman).value} unit="تومان" unitClassName="text-[0.85em] font-bold text-slate-500 ms-0.5" />
            </span>
          </div>

          <div id="quota-view-kpi-population" className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-700 font-semibold block mb-1">جمعیت مبنای تخصیص (کل کشور)</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <Num value={formatNumber(nationalPopulation)} unit="نفر" unitClassName="text-[0.6em] font-bold text-blue-500 ms-1" className="text-2xl md:text-3xl font-black text-blue-900 font-mono block" />
            <span className="text-[11px] text-blue-700 mt-1 block">
              رویه: بزرگ‌ترین رکورد هر شهرستان (رکورد «کل شهرستان») در نظر گرفته شده است
            </span>
          </div>

          <div id="quota-view-kpi-provinces" className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-semibold block mb-1">استان‌های مشمول</span>
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <Num value={toPersianDigits(provinceRows.length)} unit="استان" unitClassName="text-[0.6em] font-bold text-emerald-500 ms-1" className="text-2xl md:text-3xl font-black text-emerald-900 font-mono block" />
            <span className="text-[11px] text-emerald-700 mt-1 block">
              حاصل جمع شهرستان‌های ثبت‌شده هر استان
            </span>
          </div>

          <div id="quota-view-kpi-counties" className="bg-violet-50/70 p-4 rounded-2xl border border-violet-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-violet-700 font-semibold block mb-1">شهرستان‌های مشمول</span>
              <Building2 className="w-4 h-4 text-violet-600" />
            </div>
            <Num value={formatNumber(countyRows.length)} unit="شهرستان" unitClassName="text-[0.6em] font-bold text-violet-500 ms-1" className="text-2xl md:text-3xl font-black text-violet-900 font-mono block" />
            <span className="text-[11px] text-violet-700 mt-1 block">
              کسری گردکردن جداول نسبت به بودجه: <Num value={formatMoneyParts(Math.abs(quotaSumDrift)).value} unit={formatMoneyParts(Math.abs(quotaSumDrift)).unit} unitClassName="text-[0.85em] font-bold text-violet-500 ms-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Method notice */}
      <div
        id="quota-view-method-notice"
        className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-amber-900"
      >
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div id="quota-view-method-notice-2" className="text-xs leading-relaxed">
          <p className="font-bold text-amber-950 mb-1">معیار نخست تخصیص: جمعیت ساکن (سهم نسبی)</p>
          <p className="text-amber-800">
            در همین نسخه، تنها معیار تخصیص «جمعیت» است: هر شهرستان دقیقاً برابر نسبت جمعیتی خود از کل کشور سهم می‌گیرد و سرانه بودجه برای همه شهرستان‌ها یکسان است. داده جمعیتی ثبت‌شده در پایگاه داده (ماحولا «شاخص‌های مکانی») مبنای محاسبه است؛ پس هر اصلاح جمعیت در آن رجیستری با اجرای مجدد محاسبه سهمیه، مستقیماً این جدول را به‌روز می‌کند.
          </p>
        </div>
      </div>

      {/* Controls: search */}
      <div id="quota-view-controls" className="flex flex-wrap items-center gap-3">
        <div id="quota-view-controls-search" className="relative flex-1 min-w-56">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
          <input
            id="quota-view-controls-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جست‌وجوی استان یا شهرستان…"
            className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-shadow"
          />
        </div>

      </div>

      {/* Data panel */}
      <div id="quota-view-data-panel" className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {viewMode === 'PROVINCES' ? (
          <div id="quota-view-provinces-table-wrapper" className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-black">رتبه</th>
                  <th className="p-3.5 font-black">استان</th>
                  <th className="p-3.5 font-black font-mono">تعداد شهرستان</th>
                  <th className="p-3.5 font-black font-mono">جمعیت</th>
                  <th className="p-3.5 font-black font-mono text-emerald-700">درصد سهم</th>
                  <th className="p-3.5 font-black font-mono text-slate-700">سهمیه بودجه (تومان)</th>
                  <th className="p-3.5 font-black min-w-40">سهم از کل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProvinces.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      رکوردی در رجیستری مکان‌ها یافت نشد.
                    </td>
                  </tr>
                )}
                {filteredProvinces.map((p, idx) => (
                  <tr
                    key={p.province}
                    className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${selectedLocation.province === p.province ? 'bg-emerald-50/60' : ''}`}
                    onClick={() => {
                      setViewMode('COUNTIES');
                      setProvinceFilter(p.province);
                      setSearch('');
                    }}
                  >
                    <td className="p-3.5 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{p.province}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{toPersianDigits(p.counties)}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-800">{formatNumber(p.population)}</td>
                    <td className="p-3.5 font-mono font-black text-emerald-700">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 inline-block">
                        <Num value={formatPercent(p.sharePercent, { fractionDigits: 2 })} />
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-black text-slate-900 whitespace-nowrap">
                      <Num value={`${formatMoneyParts(p.quotaToman).value} ${formatMoneyParts(p.quotaToman).unit}`} />
                    </td>
                    <td className="p-3.5">
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: maxProvinceShare ? `${(p.sharePercent / maxProvinceShare) * 100}%` : '0%' }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-black text-slate-800">
                <tr>
                  <td className="p-3.5" colSpan={3}>جمع کشور</td>
                  <td className="p-3.5 font-mono">{formatNumber(nationalPopulation)}</td>
                  <td className="p-3.5 font-mono text-emerald-700">۱۰۰٪</td>
                  <td className="p-3.5 font-mono whitespace-nowrap">{formatMoneyParts(totalBudget).value} {formatMoneyParts(totalBudget).unit}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div id="quota-view-counties-table-wrapper" className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5 font-black">رتبه</th>
                  <th className="p-3.5 font-black">شهرستان</th>
                  <th className="p-3.5 font-black">استان</th>
                  <th className="p-3.5 font-black font-mono">جمعیت</th>
                  <th className="p-3.5 font-black font-mono text-emerald-700">درصد سهم</th>
                  <th className="p-3.5 font-black font-mono text-slate-700">سهمیه بودجه (تومان)</th>
                  <th className="p-3.5 font-black min-w-40">سهم از کل</th>
                  <th className="p-3.5 font-black">تنظیم مکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCounties.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      شهرستانی مطابق عبارت جست‌وجو یافت نشد.
                    </td>
                  </tr>
                )}
                {filteredCounties.slice(0, 300).map((r, idx) => {
                  const isSelected = selectedLocation.county === r.county;
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-emerald-50/40 transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                    >
                      <td className="p-3.5 font-mono text-slate-400">{toPersianDigits(idx + 1)}</td>
                      <td className="p-3.5 font-bold text-slate-900">{r.county}</td>
                      <td className="p-3.5 text-slate-600">{r.province}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">{formatNumber(r.population)}</td>
                      <td className="p-3.5 font-mono font-black text-emerald-700">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 inline-block">
                          <Num value={formatPercent(r.sharePercent, { fractionDigits: 2 })} />
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-black text-slate-900 whitespace-nowrap">
                        <Num value={`${formatMoneyParts(r.quotaToman).value} ${formatMoneyParts(r.quotaToman).unit}`} />
                      </td>
                      <td className="p-3.5">
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: maxCountyShare ? `${(r.sharePercent / maxCountyShare) * 100}%` : '0%' }}
                          />
                        </div>
                      </td>
                      <td className="p-3.5">
                        <button
                          onClick={() => {
                            const target = locations.find((l) => l.id === r.id);
                            if (target) handleSelectLocation(target);
                          }}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px] border border-blue-200 transition-colors"
                        >
                          تنظیم فیلتر
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredCounties.length > 300 && (
              <div id="quota-view-counties-limited-note" className="p-3 text-center text-[11px] text-slate-500 border-t border-slate-100 bg-slate-50">
                نمایش ۳۰۰ شهرستان نخست (رتبه بالاتر = جمعیت بیشتر)؛ برای بزرگ‌نمایی از جست‌وجو یا فیلتر استان استفاده کنید.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
