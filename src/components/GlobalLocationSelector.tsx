import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LocationData } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import { MapPin, Globe, Sparkles, Sliders, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface GlobalLocationSelectorProps {
  locations: LocationData[];
  selectedLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  vulnerabilityIndex: number;
  onClose: () => void;
  onApplySmartRecommendations?: () => void;
  onOpenIndicatorsTab?: () => void;
  activeTab?: string;
}

/**
 * Geographic filter, presented as a modal dialog: the sidebar «تغییر» button
 * opens it over the workspace, the three cascading selects (province → county →
 * city/district) re-filter the whole system live, and the dialog stays open so
 * the operator can walk the cascade in one visit before closing it.
 */
export const GlobalLocationSelector: React.FC<GlobalLocationSelectorProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  vulnerabilityIndex,
  onClose,
  onApplySmartRecommendations,
  onOpenIndicatorsTab,
  activeTab,
}) => {
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes the dialog, like any other modal surface.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Outside click closes the dialog, matching the export dropdown's behavior.
  useOutsideClick(dialogRef, onClose);

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
    <div
      id="global-location-selector-root"
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 dir-rtl"
    >
      <div
        ref={dialogRef}
        id="global-location-selector-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-location-selector-title"
        className="bg-white text-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div id="global-location-selector-header" className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/70 to-indigo-50/50 flex items-start justify-between gap-4 shrink-0">
          <div id="global-location-selector-header-2" className="flex items-center gap-3">
            <div id="global-location-selector-header-3" className="p-2 bg-blue-100 text-blue-600 rounded-xl border border-blue-200 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div id="global-location-selector-header-4">
              <h3 id="global-location-selector-title" className="font-extrabold text-sm text-slate-900">
                فیلتر جغرافیایی فعال
              </h3>
              <p id="global-location-selector-header-5" className="text-[10px] text-slate-500 mt-0.5">
                کنترل یکپارچه کل سامانه — استان، شهرستان و شهر هدف را انتخاب کنید
              </p>
            </div>
          </div>
          <button
            id="global-location-selector-close-button"
            onClick={onClose}
            title="بستن پنجره فیلتر جغرافیایی"
            aria-label="بستن"
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: cascading selectors + live badges */}
        <div id="global-location-selector-body" className="p-5 overflow-y-auto space-y-4">
          <div id="global-location-selector-cascade-fields" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Province Dropdown */}
            <div id="global-location-selector-province-dropdown" className="flex flex-col text-right">
              <label className="text-[10px] text-slate-500 font-bold mb-1 mr-1">استان هدف</label>
              <select
                value={selectedLocation.province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer shadow-2xs"
              >
                {provinces.map((prov) => (
                  <option key={prov} value={prov} className="bg-white text-slate-800">
                    استان {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* County Dropdown */}
            <div id="global-location-selector-county-dropdown" className="flex flex-col text-right">
              <label className="text-[10px] text-slate-500 font-bold mb-1 mr-1">شهرستان</label>
              <select
                value={selectedLocation.county}
                onChange={(e) => handleCountyChange(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer shadow-2xs"
              >
                {availableCounties.map((cnt) => (
                  <option key={cnt} value={cnt} className="bg-white text-slate-800">
                    شهرستان {cnt}
                  </option>
                ))}
              </select>
            </div>

            {/* District / City Dropdown */}
            <div id="global-location-selector-district-city-dropdown" className="flex flex-col text-right">
              <label className="text-[10px] text-slate-500 font-bold mb-1 mr-1">شهر / بخش / منطقه هدف</label>
              <select
                value={selectedLocation.id}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full bg-blue-50/60 hover:bg-blue-50 border border-blue-300 text-blue-900 font-black text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer shadow-xs"
              >
                {availableDistricts.map((d) => (
                  <option key={d.id} value={d.id} className="bg-white text-slate-800 font-medium">
                    {d.city} | {d.district}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Indicator Badges */}
          <div id="global-location-selector-real-time-indicator-badges" className="flex items-center gap-3 flex-wrap">
            {/* Population Badge */}
            <div id="global-location-selector-population-badge" className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
              <div id="global-location-selector-population-badge-2" className="text-[10px] text-slate-500">جمعیت تحت پوشش</div>
                <div id="global-location-selector-population-badge-3" className="text-xs font-bold text-slate-800">
                {toPersianDigits(selectedLocation.population.toLocaleString('fa-IR'))} نفر
              </div>
            </div>

            {/* Vulnerability Index Badge */}
            <div id="global-location-selector-vulnerability-index-badge" className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
              <div id="global-location-selector-vulnerability-index-badge-2" className="text-[10px] text-slate-500">آسیب‌پذیری منطقه</div>
                <div id="global-location-selector-vulnerability-index-badge-3" className="text-xs font-extrabold text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>{toPersianDigits(vulnerabilityIndex)} از ۱۰۰</span>
              </div>
            </div>

            <div id="global-location-selector-active-scope" className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-right flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-700">
                {selectedLocation.province} - {selectedLocation.county} - {selectedLocation.city}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div id="global-location-selector-footer" className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div id="global-location-selector-footer-2" className="flex items-center gap-2 flex-wrap">
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
                    : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
                }`}
                title="ویرایش دقیق ۱۱ شاخص محرومیت این منطقه"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>ویرایش شاخص‌ها</span>
              </button>
            )}
          </div>

          <button
            id="global-location-selector-confirm-button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm text-xs font-bold transition-colors cursor-pointer"
          >
            تایید و بستن
          </button>
        </div>
      </div>
    </div>
  );
};
