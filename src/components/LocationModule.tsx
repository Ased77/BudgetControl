import React, { useState, useEffect, useMemo } from 'react';
import { LocationData, LocalIndicators } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import { MapPin, Sliders, CheckCircle2, Search, Filter, Globe, BarChart2 } from 'lucide-react';
import { ComparativeHarmsTable } from './ComparativeHarmsTable';

interface LocationModuleProps {
  locations: LocationData[];
  selectedLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onUpdateIndicators: (indicators: LocalIndicators) => void;
}

export const LocationModule: React.FC<LocationModuleProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onUpdateIndicators,
}) => {
  // Province filter state (defaults to selectedLocation.province)
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<string>(selectedLocation.province);
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const handleIndicatorChange = (key: keyof LocalIndicators, val: number) => {
    onUpdateIndicators({
      ...selectedLocation.indicators,
      [key]: Math.min(100, Math.max(0, val)),
    });
  };

  return (
    <div id="location-module-root" className="space-y-6 dir-rtl">
      
      {/* Region Selector Grid Header & Controls */}
      <div id="location-module-region-selector-grid-header" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div id="location-module-region-selector-grid-header-2" className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div id="location-module-region-selector-grid-header-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              انتخاب و پایش لوکیشن‌های محلی (هدف CSR)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              با انتخاب هر لوکیشن، تمام محاسبات بودجه، نمودارها و فرمول‌های AI در سراسر سامانه به‌صورت آنی به‌روز می‌شوند
            </p>
          </div>

        </div>

        {/* Filter and Search Bar */}
        <div id="location-module-filter-and-search-bar" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          
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

        {/* Location Cards Grid */}
        <div id="location-module-location-cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {filteredLocations.length === 0 ? (
            <div id="location-module-location-cards-grid-2" className="col-span-full text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              هیچ لوکیشنی با مشخصات جستجو شده یافت نشد
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const isSelected = loc.id === selectedLocation.id;
              return (
                <div
                  id={`location-module-location-cards-grid-3-${loc.id}`}
                  key={loc.id}
                  onClick={() => onSelectLocation(loc)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all text-right flex flex-col justify-between ${
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
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          لوکیشن فعال
                        </span>
                      )}
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm mt-1">
                      شهرستان {loc.county}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 flex items-start gap-1 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {loc.city} ({loc.district})
                      </span>
                    </p>
                  </div>

                  <div id={`location-module-location-cards-grid-6-${loc.id}`} className="mt-3 pt-2 border-t border-slate-100 space-y-1.5">
                    <div id={`location-module-location-cards-grid-7-${loc.id}`} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>جمعیت محلی:</span>
                      <strong className="text-slate-800">
                        {toPersianDigits(loc.population.toLocaleString('fa-IR'))} نفر
                      </strong>
                    </div>
                    <div id={`location-module-location-cards-grid-8-${loc.id}`} className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>نرخ فقر:</span>
                      <strong className="text-rose-600 font-bold">
                        {toPersianDigits(loc.indicators.povertyRate)}٪
                      </strong>
                    </div>

                    <button
                      type="button"
                      className={`w-full mt-2 py-1.5 rounded-xl text-xs font-bold transition-all text-center ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
                      }`}
                    >
                      {isSelected ? 'لوکیشن فعال سیستم' : 'انتخاب برای کل سامانه'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
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

    </div>
  );
};

