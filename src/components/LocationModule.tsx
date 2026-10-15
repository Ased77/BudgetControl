import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LocationData, LocalIndicators } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import { MapPin, Sliders, CheckCircle2, Search, Filter, Globe, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { ComparativeHarmsTable } from './ComparativeHarmsTable';
import { PageHeader } from './PageHeader';

/**
 * The eleven local indicators every location record carries, in the order the
 * edit modal lays them out. `max: null` marks a head count rather than a 0-100
 * score, so the modal renders it as a plain number field instead of a slider.
 */
const LOCATION_INDICATOR_FIELDS: Array<{
  key: keyof LocalIndicators;
  label: string;
  hint: string;
  max: number | null;
  unit: string;
}> = [
  { key: 'povertyRate', label: 'نرخ فقر و محرومیت', hint: 'خانوار زیر خط فقر نسبی', max: 100, unit: '٪' },
  { key: 'marginalizationRate', label: 'درصد حاشیه‌نشینی', hint: 'سکونتگاه‌های غیررسمی', max: 100, unit: '٪' },
  { key: 'unemploymentRate', label: 'نرخ بیکاری محلی', hint: 'جوانان جویای کار منطقه', max: 100, unit: '٪' },
  { key: 'socialHarmsIndex', label: 'شاخص آسیب‌های اجتماعی', hint: 'اعتیاد، طلاق و بزهکاری', max: 100, unit: 'از ۱۰۰' },
  { key: 'healthAccessDeficit', label: 'کمبود دسترسی درمان و بهداشت', hint: 'تخت و کلینیک به ازای جمعیت', max: 100, unit: 'از ۱۰۰' },
  { key: 'educationDropOutRate', label: 'نرخ ترک تحصیل', hint: 'بازماندگی دانش‌آموزان', max: 100, unit: '٪' },
  { key: 'infrastructureDeficit', label: 'کمبود زیرساخت عمرانی', hint: 'راه، آب شرب و تأسیسات پایه', max: 100, unit: 'از ۱۰۰' },
  { key: 'culturalDeficitScore', label: 'کمبود زیرساخت فرهنگی و نشاط', hint: 'ورزش، فرهنگ‌سرا و مشاوره', max: 100, unit: 'از ۱۰۰' },
  { key: 'crisisVulnerabilityScore', label: 'آسیب‌پذیری در برابر بحران', hint: 'زلزله، سیلاب و آمادگی امداد', max: 100, unit: 'از ۱۰۰' },
  { key: 'environmentalRiskScore', label: 'ریسک آلودگی زیست‌محیطی', hint: 'فلر، پساب و فضای سبز', max: 100, unit: 'از ۱۰۰' },
  { key: 'vulnerableGroupsPopulation', label: 'جمعیت گروه‌های آسیب‌پذیر', hint: 'افراد نیازمند حمایت مستقیم', max: null, unit: 'نفر' },
];

/**
 * Location cards revealed per page of the region grid. The grid is a single
 * horizontal row of fixed-width cards that scrolls sideways rather than wrapping
 * into columns, so a page fills that row's own track; the pager under the grid
 * walks the rest of whatever the filters left behind.
 */
const LOCATION_PAGE_SIZE = 12;

interface LocationModuleProps {
  locations: LocationData[];
  selectedLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onUpdateIndicators: (indicators: LocalIndicators) => void;
  /** Saves a whole edited location record, whichever card it came from. */
  onUpdateLocation: (loc: LocationData) => void;
}

export const LocationModule: React.FC<LocationModuleProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onUpdateIndicators,
  onUpdateLocation,
}) => {
  // Province filter state (defaults to selectedLocation.province)
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>(selectedLocation.province);
  const [searchQuery, setSearchQuery] = useState<string>('');
  /** Current page of the region grid — 1-based, and clamped to the result set. */
  const [locationPage, setLocationPage] = useState<number>(1);

  // Card click opens this dialog instead of re-scoping the whole system: the
  // active location only changes from the card's own selection control.
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [draftIndicators, setDraftIndicators] = useState<LocalIndicators | null>(null);
  const [draftPopulation, setDraftPopulation] = useState<number>(0);
  const editDialogRef = useRef<HTMLDivElement>(null);

  const closeLocationEditor = () => {
    setEditingLocation(null);
    setDraftIndicators(null);
  };

  const openLocationEditor = (loc: LocationData) => {
    setEditingLocation(loc);
    setDraftIndicators({ ...loc.indicators });
    setDraftPopulation(loc.population);
  };

  const handleDraftIndicatorChange = (key: keyof LocalIndicators, val: number) => {
    setDraftIndicators((prev) => (prev ? { ...prev, [key]: val } : prev));
  };

  const handleSaveLocationEdit = () => {
    if (!editingLocation || !draftIndicators) return;
    onUpdateLocation({
      ...editingLocation,
      population: Math.max(0, Math.round(draftPopulation) || 0),
      indicators: draftIndicators,
    });
    closeLocationEditor();
  };

  // Escape and outside click dismiss the dialog, matching the app's modals.
  useEffect(() => {
    if (!editingLocation) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLocationEditor();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingLocation]);
  useOutsideClick(editDialogRef, closeLocationEditor);

  // Synchronize filter when selectedLocation changes globally
  useEffect(() => {
    setSelectedProvinceFilter(selectedLocation.province);
  }, [selectedLocation.province]);

  // Unique list of provinces
  const provinces = useMemo(() => {
    return Array.from(new Set(locations.map((l) => l.province)));
  }, [locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesProvince =
        selectedProvinceFilter === 'ALL' || loc.province === selectedProvinceFilter;
      const matchesSearch =
        !searchQuery ||
        loc.province.includes(searchQuery) ||
        loc.county.includes(searchQuery) ||
        loc.city.includes(searchQuery) ||
        loc.district.includes(searchQuery);

      return matchesProvince && matchesSearch;
    });
  }, [locations, selectedProvinceFilter, searchQuery]);

  // Paging of the region grid: the registry is filtered first and sliced second,
  // so the pager always speaks about what the filters left behind rather than the
  // whole country. The page is clamped rather than trusted — a filter can shrink
  // the set under it — and any narrowing of that set drops the reader back to
  // page one, so a new filter can never strand them on a page with no rows.
  const locationPageCount = Math.max(1, Math.ceil(filteredLocations.length / LOCATION_PAGE_SIZE));
  const safeLocationPage = Math.min(locationPage, locationPageCount);
  const pagedLocations = useMemo(
    () => filteredLocations.slice((safeLocationPage - 1) * LOCATION_PAGE_SIZE, safeLocationPage * LOCATION_PAGE_SIZE),
    [filteredLocations, safeLocationPage]
  );

  useEffect(() => {
    setLocationPage(1);
  }, [searchQuery, selectedProvinceFilter]);

  const handleIndicatorChange = (key: keyof LocalIndicators, val: number) => {
    onUpdateIndicators({
      ...selectedLocation.indicators,
      [key]: Math.min(100, Math.max(0, val)),
    });
  };

  return (
    <div id="location-module-root" className="space-y-6 dir-rtl">
      {/* Page title block — this tab previously opened straight into the card below. */}
      <PageHeader
        id="location-module-page-header"
        icon={MapPin}
        title="شاخص‌های مکانی و لوکیشن‌های هدف"
        subtitle="انتخاب لوکیشن و پایش شاخص‌های محرومیت همان منطقه"
        tone="text-emerald-600"
      />

      {/* Region Selector Grid Header & Controls */}
      <div id="location-module-region-selector-grid-header" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        {/* Title and controls share one row — the panel used to open on three
            stacked blocks (title, province pills, search) before the grid. The
            hint line stays on a single truncated line and only appears where
            there is room for it, so nothing wraps the row at desktop widths. */}
        <div id="location-module-region-selector-grid-header-2" className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div id="location-module-region-selector-grid-header-3" className="min-w-0">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="whitespace-nowrap">انتخاب و پایش لوکیشن‌های محلی (هدف CSR)</span>
            </h2>
            <p
              className="hidden xl:block text-[11px] text-slate-500 mt-0.5 truncate"
              title="با انتخاب هر لوکیشن، تمام محاسبات بودجه، نمودارها و فرمول‌های AI در سراسر سامانه به‌صورت آنی به‌روز می‌شوند"
            >
              با انتخاب هر لوکیشن، تمام محاسبات بودجه، نمودارها و فرمول‌های AI در سراسر سامانه به‌صورت آنی به‌روز می‌شوند
            </p>
          </div>

          {/* Filter and Search Bar — rides the title's row from `xl` up. */}
          <div id="location-module-filter-and-search-bar" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0">

            {/* Province Filter Pills */}
            <div id="location-module-province-filter-pills" className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0 ml-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                فیلتر استان:
              </span>

              <button
                onClick={() => setSelectedProvinceFilter(selectedLocation.province)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedProvinceFilter === selectedLocation.province
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                استان {selectedLocation.province} (فعال)
              </button>

              <button
                onClick={() => setSelectedProvinceFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedProvinceFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                همه استان‌ها ({toPersianDigits(locations.length)})
              </button>

              {provinces
                .filter((p) => p !== selectedLocation.province)
                .map((prov) => (
                  <button
                    key={prov}
                    onClick={() => setSelectedProvinceFilter(prov)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedProvinceFilter === prov
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {prov}
                  </button>
                ))}
            </div>

            {/* Search Box */}
            <div id="location-module-search-box" className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="جستجوی شهرستان یا محله..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              />
            </div>

          </div>
        </div>

        {/* Location Cards Grid — one row of fixed-width cards that scrolls
            sideways instead of wrapping into columns, so every region sits on the
            same line and the strip's height stays constant however many a page
            holds. The cards are `shrink-0` so the row scrolls rather than
            squashing them; `scrollbar-none` hides the track, matching the
            province pill row above and the sidebar nav. The `py-3` keeps the
            selected card's ring and the hover shadow from being clipped. */}
        <div id="location-module-location-cards-grid" className="flex gap-4 py-3 overflow-x-auto scrollbar-none">
          {filteredLocations.length === 0 ? (
            <div id="location-module-location-cards-grid-2" className="w-full text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              هیچ لوکیشنی با مشخصات جستجو شده یافت نشد
            </div>
          ) : (
            pagedLocations.map((loc) => {
              const isSelected = loc.id === selectedLocation.id;
              return (
                <div
                  id={`location-module-location-cards-grid-3-${loc.id}`}
                  key={loc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLocationEditor(loc)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openLocationEditor(loc);
                    }
                  }}
                  title="کلیک برای ویرایش مشخصات و شاخص‌های این لوکیشن"
                  className={`shrink-0 w-64 cursor-pointer p-4 rounded-2xl border transition-all text-right flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                  }`}
                >
                  <div id={`location-module-location-cards-grid-4-${loc.id}`}>
                    <div id={`location-module-location-cards-grid-5-${loc.id}`} className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        استان {loc.province}
                      </span>
                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          لوکیشن فعال
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <Pencil className="w-3.5 h-3.5" />
                          ویرایش
                        </span>
                      )}
                    </div>

                    <div id={`location-module-location-cards-grid-6-${loc.id}`} className="flex items-center gap-2.5 mt-1">
                      <div
                        id={`location-module-location-cards-grid-7-${loc.id}`}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <MapPin className="w-6 h-6" />
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        شهرستان {loc.county}
                      </h3>
                    </div>
                  </div>

                  <div id={`location-module-location-cards-grid-8-${loc.id}`} className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                    <div id={`location-module-location-cards-grid-9-${loc.id}`} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>جمعیت محلی:</span>
                      <strong className="text-slate-800">
                        {toPersianDigits(loc.population.toLocaleString('fa-IR'))} نفر
                      </strong>
                    </div>
                    <div id={`location-module-location-cards-grid-10-${loc.id}`} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>نرخ فقر:</span>
                      <strong className="text-rose-600 font-bold">
                        {toPersianDigits(loc.indicators.povertyRate)}٪
                      </strong>
                    </div>

                    {/* The only control that re-scopes the whole system to this
                        location. Clicking the card body opens the edit dialog,
                        so the selection click must not bubble up to it. */}
                    {isSelected ? (
                      <span className="block w-full mt-2 py-1.5 rounded-xl text-xs font-bold text-center bg-blue-600 text-white shadow-xs">
                        لوکیشن فعال سیستم
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectLocation(loc);
                        }}
                        className="w-full mt-2 py-1.5 rounded-xl text-xs font-bold transition-all text-center bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200"
                      >
                        انتخاب برای کل سامانه
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pager — drawn only when the filtered set spills past one page, so a
            short result list keeps the panel as quiet as it was before. */}
        {locationPageCount > 1 && (
          <div
            id="location-module-region-selector-pagination"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100"
          >
            <span
              id="location-module-region-selector-pagination-summary"
              className="text-[11px] font-bold text-slate-500"
            >
              نمایش {toPersianDigits((safeLocationPage - 1) * LOCATION_PAGE_SIZE + 1)} تا{' '}
              {toPersianDigits(Math.min(safeLocationPage * LOCATION_PAGE_SIZE, filteredLocations.length))} از{' '}
              {toPersianDigits(filteredLocations.length)} لوکیشن
            </span>

            <div id="location-module-region-selector-pagination-controls" className="flex items-center gap-1.5 flex-wrap">
              <button
                id="location-module-region-selector-pagination-prev"
                type="button"
                onClick={() => setLocationPage((page) => Math.max(1, page - 1))}
                disabled={safeLocationPage === 1}
                title="صفحه قبلی"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-50"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                قبلی
              </button>

              {locationPageCount <= 7 ? (
                Array.from({ length: locationPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    id={`location-module-region-selector-pagination-page-${page}`}
                    key={page}
                    type="button"
                    onClick={() => setLocationPage(page)}
                    aria-current={safeLocationPage === page ? 'page' : undefined}
                    className={`min-w-8 px-2 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      safeLocationPage === page
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {toPersianDigits(page)}
                  </button>
                ))
              ) : (
                <span id="location-module-region-selector-pagination-position" className="px-1 text-xs font-bold text-slate-600">
                  صفحه {toPersianDigits(safeLocationPage)} از {toPersianDigits(locationPageCount)}
                </span>
              )}

              <button
                id="location-module-region-selector-pagination-next"
                type="button"
                onClick={() => setLocationPage((page) => Math.min(locationPageCount, page + 1))}
                disabled={safeLocationPage === locationPageCount}
                title="صفحه بعدی"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-50"
              >
                بعدی
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comparative Social Harms Table (Local vs Province & National) */}
      <ComparativeHarmsTable
        currentLocation={selectedLocation}
        allLocations={locations}
        onSelectLocation={onSelectLocation}
      />

      {/* Interactive Indicators Panel */}
      <div id="location-module-interactive-indicators-panel" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
        <div id="location-module-interactive-indicators-panel-2" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
          <div id="location-module-interactive-indicators-panel-3" className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              ویرایش ۱۱ شاخص محلی برای: {selectedLocation.province} - شهرستان {selectedLocation.county} ({selectedLocation.district})
            </h3>
          </div>
          <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            تغییر این اسلایدرها بلافاصله پیشنهادات هوشمند AI را در سراسر سامانه به‌روز می‌کند
          </span>
        </div>

        <div id="location-module-interactive-indicators-panel-4" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
          
          {/* Poverty Rate */}
          <div id="location-module-poverty-rate" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div id="location-module-poverty-rate-2" className="flex justify-between font-bold text-slate-800 mb-1">
              <span>نرخ فقر و محرومیت</span>
              <span className="text-blue-700">{toPersianDigits(selectedLocation.indicators.povertyRate)}٪</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLocation.indicators.povertyRate}
              onChange={(e) => handleIndicatorChange('povertyRate', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              درصد خانوار زیر خط فقر نسبی شهری
            </p>
          </div>

          {/* Marginalization Rate */}
          <div id="location-module-marginalization-rate" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div id="location-module-marginalization-rate-2" className="flex justify-between font-bold text-slate-800 mb-1">
              <span>درصد حاشیه‌نشینی</span>
              <span className="text-blue-700">{toPersianDigits(selectedLocation.indicators.marginalizationRate)}٪</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLocation.indicators.marginalizationRate}
              onChange={(e) => handleIndicatorChange('marginalizationRate', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              نسبت جمعیت ساکن در سکونتگاه‌های غیررسمی
            </p>
          </div>

          {/* Unemployment Rate */}
          <div id="location-module-unemployment-rate" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div id="location-module-unemployment-rate-2" className="flex justify-between font-bold text-slate-800 mb-1">
              <span>نرخ بیکاری محلی</span>
              <span className="text-blue-700">{toPersianDigits(selectedLocation.indicators.unemploymentRate)}٪</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLocation.indicators.unemploymentRate}
              onChange={(e) => handleIndicatorChange('unemploymentRate', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              نرخ بیکاری جوانان جویای کار منطقه
            </p>
          </div>

          {/* Social Harms Index */}
          <div id="location-module-social-harms-index" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div id="location-module-social-harms-index-2" className="flex justify-between font-bold text-slate-800 mb-1">
              <span>شاخص آسیب‌های اجتماعی</span>
              <span className="text-rose-700">{toPersianDigits(selectedLocation.indicators.socialHarmsIndex)} از ۱۰۰</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLocation.indicators.socialHarmsIndex}
              onChange={(e) => handleIndicatorChange('socialHarmsIndex', parseFloat(e.target.value))}
              className="w-full accent-rose-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              شیوع اعتیاد، طلاق و بزهکاری بر اساس آمار رسمی بهزیستی
            </p>
          </div>

          {/* Health Deficit */}
          <div id="location-module-health-deficit" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div id="location-module-health-deficit-2" className="flex justify-between font-bold text-slate-800 mb-1">
              <span>کمبود دسترسی درمان و بهداشت</span>
              <span className="text-blue-700">{toPersianDigits(selectedLocation.indicators.healthAccessDeficit)}٪</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLocation.indicators.healthAccessDeficit}
              onChange={(e) => handleIndicatorChange('healthAccessDeficit', parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              تخت بیمارستانی و کلینیک به ازای هزار نفر جمعیت
            </p>
          </div>

          {/* Environmental Risk */}
          <div id="location-module-environmental-risk" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div id="location-module-environmental-risk-2" className="flex justify-between font-bold text-slate-800 mb-1">
              <span>ریسک آلودگی زیست‌محیطی</span>
              <span className="text-amber-700">{toPersianDigits(selectedLocation.indicators.environmentalRiskScore)} از ۱۰۰</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedLocation.indicators.environmentalRiskScore}
              onChange={(e) => handleIndicatorChange('environmentalRiskScore', parseFloat(e.target.value))}
              className="w-full accent-amber-600"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              آلودگی فلرها، پساب و کمبود فضای سبز پیرامونی
            </p>
          </div>

        </div>
      </div>

      {/* Location Edit Dialog — opened by clicking a card in the grid above.
          It edits the record that card stands for (population + the eleven
          local indicators) and never re-scopes the system by itself: the only
          controls that change the active location are the card's selection
          button and the secondary action in this footer. */}
      {editingLocation && draftIndicators && (
        <div
          id="location-module-edit-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm dir-rtl"
        >
          <div
            ref={editDialogRef}
            id="location-module-edit-modal-2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-module-edit-modal-title"
            className="bg-white rounded-2xl w-full max-w-3xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div id="location-module-edit-modal-header" className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/70 to-indigo-50/50 flex items-start justify-between gap-4 shrink-0">
              <div id="location-module-edit-modal-header-2" className="flex items-center gap-3">
                <div id="location-module-edit-modal-header-3" className="p-2 bg-blue-100 text-blue-600 rounded-xl border border-blue-200 shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div id="location-module-edit-modal-header-4">
                  <h3 id="location-module-edit-modal-title" className="font-extrabold text-sm text-slate-900">
                    ویرایش لوکیشن — {editingLocation.county}
                  </h3>
                  <p id="location-module-edit-modal-header-5" className="text-[11px] text-slate-500 mt-0.5">
                    {editingLocation.city} ({editingLocation.district}) — ذخیره تغییرات، محاسبات همین لوکیشن را به‌روز می‌کند
                  </p>
                </div>
              </div>
              <button
                id="location-module-edit-modal-close-button"
                type="button"
                onClick={closeLocationEditor}
                title="بستن پنجره ویرایش لوکیشن"
                aria-label="بستن"
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body: identity, population and the eleven local indicators */}
            <div id="location-module-edit-modal-body" className="p-5 overflow-y-auto space-y-5">
              <div id="location-module-edit-modal-identity" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div id="location-module-edit-modal-identity-province" className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500">استان</span>
                  <strong className="block text-xs font-black text-slate-800 mt-0.5">{editingLocation.province}</strong>
                </div>
                <div id="location-module-edit-modal-identity-county" className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500">شهرستان</span>
                  <strong className="block text-xs font-black text-slate-800 mt-0.5">{editingLocation.county}</strong>
                </div>
                <div id="location-module-edit-modal-identity-city" className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500">شهر / بخش</span>
                  <strong className="block text-xs font-black text-slate-800 mt-0.5">{editingLocation.city}</strong>
                </div>
                <div id="location-module-edit-modal-identity-district" className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-500">محدوده هدف</span>
                  <strong className="block text-xs font-black text-slate-800 mt-0.5">{editingLocation.district}</strong>
                </div>
              </div>

              <div id="location-module-edit-modal-population" className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div id="location-module-edit-modal-population-2" className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-800">جمعیت محلی</span>
                  <span className="text-xs font-black text-blue-700">
                    {toPersianDigits(draftPopulation.toLocaleString('fa-IR'))} نفر
                  </span>
                </div>
                <input
                  id="location-module-edit-modal-population-input"
                  type="number"
                  min={0}
                  step={100}
                  value={draftPopulation}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setDraftPopulation(Number.isFinite(next) ? Math.max(0, next) : 0);
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  مبنای محاسبه نرخ پوشش و برآورد بهره‌برداران در سامانه
                </p>
              </div>

              <div id="location-module-edit-modal-indicators" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LOCATION_INDICATOR_FIELDS.map((field) => {
                  const value = draftIndicators[field.key];
                  return (
                    <div
                      key={field.key}
                      id={`location-module-edit-modal-indicator-${field.key}`}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-200"
                    >
                      <div id={`location-module-edit-modal-indicator-${field.key}-2`} className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-slate-800">{field.label}</span>
                        <span className="text-[11px] font-black text-blue-700">
                          {toPersianDigits(value)} {field.unit}
                        </span>
                      </div>
                      {field.max !== null ? (
                        <input
                          type="range"
                          min={0}
                          max={field.max}
                          value={value}
                          onChange={(event) =>
                            handleDraftIndicatorChange(
                              field.key,
                              Math.min(field.max ?? 100, Math.max(0, parseFloat(event.target.value) || 0))
                            )
                          }
                          className="w-full accent-blue-600"
                        />
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={value}
                          onChange={(event) =>
                            handleDraftIndicatorChange(field.key, Math.max(0, Number(event.target.value) || 0))
                          }
                          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                        />
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">{field.hint}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div id="location-module-edit-modal-footer" className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
              <div id="location-module-edit-modal-footer-2">
                {editingLocation.id !== selectedLocation.id && (
                  <button
                    id="location-module-edit-modal-select-button"
                    type="button"
                    onClick={() => {
                      onSelectLocation(editingLocation);
                      closeLocationEditor();
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors"
                  >
                    انتخاب برای کل سامانه
                  </button>
                )}
              </div>
              <div id="location-module-edit-modal-footer-3" className="flex items-center gap-2.5 self-end">
                <button
                  id="location-module-edit-modal-cancel-button"
                  type="button"
                  onClick={closeLocationEditor}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  انصراف
                </button>
                <button
                  id="location-module-edit-modal-save-button"
                  type="button"
                  onClick={handleSaveLocationEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-colors"
                >
                  ذخیره تغییرات لوکیشن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

