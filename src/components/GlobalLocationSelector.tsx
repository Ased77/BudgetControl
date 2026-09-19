import React, { useMemo, useState } from 'react';
import { LocationData } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import { MapPin, Globe, Sparkles, Sliders, AlertTriangle, ChevronLeft, Building2, CheckCircle2 } from 'lucide-react';

interface GlobalLocationSelectorProps {
  locations: LocationData[];
  selectedLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  vulnerabilityIndex: number;
  onApplySmartRecommendations?: () => void;
  onOpenIndicatorsTab?: () => void;
  activeTab?: string;
}

export const GlobalLocationSelector: React.FC<GlobalLocationSelectorProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  vulnerabilityIndex,
  onApplySmartRecommendations,
  onOpenIndicatorsTab,
  activeTab,
}) => {
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const handleApplyClick = () => {
    if (onApplySmartRecommendations) {
      onApplySmartRecommendations();
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 2500);
    }
  };
  // Extract unique provinces
  const provinces = useMemo(() => {
    return Array.from(new Set(locations.map((l) => l.province)));
  }, [locations]);

  // Extract counties for current selected province
  const availableCounties = useMemo(() => {
    return Array.from(
      new Set(
        locations
          .filter((l) => l.province === selectedLocation.province)
          .map((l) => l.county)
      )
    );
  }, [locations, selectedLocation.province]);

  // Extract districts/cities for current selected county
  const availableDistricts = useMemo(() => {
    return locations.filter(
      (l) => l.province === selectedLocation.province && l.county === selectedLocation.county
    );
  }, [locations, selectedLocation.province, selectedLocation.county]);

  // Handle Province Change
  const handleProvinceChange = (province: string) => {
    const match = locations.find((l) => l.province === province);
    if (match) {
      onSelectLocation(match);
    }
  };

  // Handle County Change
  const handleCountyChange = (county: string) => {
    const match = locations.find(
      (l) => l.province === selectedLocation.province && l.county === county
    );
    if (match) {
      onSelectLocation(match);
    }
  };

  // Handle District / City Change
  const handleDistrictChange = (id: string) => {
    const match = locations.find((l) => l.id === id);
    if (match) {
      onSelectLocation(match);
    }
  };

  return (
    <div id="global-location-selector-root" className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-4 shadow-xl border border-slate-700/80 mb-6 dir-rtl">
      <div id="global-location-selector-div-2" className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Title and 3 Cascading Location Selectors */}
        <div id="global-location-selector-title-and-3-cascading-location" className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1 flex-wrap">
          
          <div id="global-location-selector-title-and-3-cascading-location-2" className="flex items-center gap-2 shrink-0 border-l border-slate-700/80 pl-3">
            <div id="global-location-selector-title-and-3-cascading-location-3" className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div id="global-location-selector-title-and-3-cascading-location-4">
              <div id="global-location-selector-title-and-3-cascading-location-5" className="font-extrabold text-xs text-slate-200">فیلتر جغرافیایی فعال</div>
              <div id="global-location-selector-title-and-3-cascading-location-6" className="text-[10px] text-blue-300">کنترل یکپارچه کل سامانه</div>
            </div>
          </div>

          {/* Province Dropdown */}
          <div id="global-location-selector-province-dropdown" className="flex flex-col text-right">
            <label className="text-[10px] text-slate-300 font-bold mb-1 mr-1">استان هدف</label>
            <select
              value={selectedLocation.province}
              onChange={(e) => handleProvinceChange(e.target.value)}
              className="bg-slate-800/90 hover:bg-slate-800 border border-slate-600 text-slate-100 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer shadow-2xs"
            >
              {provinces.map((prov) => (
                <option key={prov} value={prov} className="bg-slate-900 text-slate-100">
                  استان {prov}
                </option>
              ))}
            </select>
          </div>

          {/* County Dropdown */}
          <div id="global-location-selector-county-dropdown" className="flex flex-col text-right">
            <label className="text-[10px] text-slate-300 font-bold mb-1 mr-1">شهرستان</label>
            <select
              value={selectedLocation.county}
              onChange={(e) => handleCountyChange(e.target.value)}
              className="bg-slate-800/90 hover:bg-slate-800 border border-slate-600 text-slate-100 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all cursor-pointer shadow-2xs"
            >
              {availableCounties.map((cnt) => (
                <option key={cnt} value={cnt} className="bg-slate-900 text-slate-100">
                  شهرستان {cnt}
                </option>
              ))}
            </select>
          </div>

          {/* District / City Dropdown */}
          <div id="global-location-selector-district-city-dropdown" className="flex flex-col text-right">
            <label className="text-[10px] text-slate-300 font-bold mb-1 mr-1">شهر / بخش / منطقه هدف</label>
            <select
              value={selectedLocation.id}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="bg-slate-800/90 hover:bg-slate-800 border border-blue-500/80 text-white font-black text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50 transition-all cursor-pointer min-w-[180px] shadow-xs"
            >
              {availableDistricts.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100 font-medium">
                  {d.city} | {d.district}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Real-time Indicator Badges & Smart Action Button */}
        <div id="global-location-selector-real-time-indicator-badges" className="flex items-center gap-3 shrink-0 flex-wrap justify-between lg:justify-end border-t lg:border-t-0 border-slate-700/60 pt-3 lg:pt-0">
          
          {/* Population Badge */}
          <div id="global-location-selector-population-badge" className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl text-right">
            <div id="global-location-selector-population-badge-2" className="text-[10px] text-slate-400">جمعیت تحت پوشش</div>
            <div id="global-location-selector-population-badge-3" className="text-xs font-bold text-slate-200">
              {toPersianDigits(selectedLocation.population.toLocaleString('fa-IR'))} نفر
            </div>
          </div>

          {/* Vulnerability Index Badge */}
          <div id="global-location-selector-vulnerability-index-badge" className="bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-xl text-right">
            <div id="global-location-selector-vulnerability-index-badge-2" className="text-[10px] text-slate-400">آسیب‌پذیری منطقه</div>
            <div id="global-location-selector-vulnerability-index-badge-3" className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{toPersianDigits(vulnerabilityIndex)} از ۱۰۰</span>
            </div>
          </div>

          {/* Smart AI Re-allocation trigger button */}
          {onApplySmartRecommendations && (
            <button
              onClick={handleApplyClick}
              className={`flex items-center gap-1.5 font-bold px-3.5 py-2 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
                appliedSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-600/30'
              }`}
              title="اعمال فرمول هوشمند وزن‌دهی تخصیص بودجه برای این لوکیشن"
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200 animate-bounce" />
                  <span>با موفقیت روی جدول اعمال شد ✓</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>محاسبه هوشمند تخصیص این منطقه</span>
                </>
              )}
            </button>
          )}

          {/* View indicators button */}
          {onOpenIndicatorsTab && (
            <button
              onClick={onOpenIndicatorsTab}
              className={`flex items-center gap-1 font-bold px-3 py-2 rounded-xl text-xs border transition-all active:scale-95 cursor-pointer ${
                activeTab === 'LOCATIONS'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700'
              }`}
              title="ویرایش دقیق ۱۱ شاخص محرومیت این منطقه"
            >
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>ویرایش شاخص‌ها</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
