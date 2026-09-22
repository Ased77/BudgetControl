import React, { useMemo } from 'react';
import { LocationData } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import { AlertTriangle, MapPin } from 'lucide-react';

interface LocationCascadeProps {
  locations: LocationData[];
  selectedLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  /** Show the live population/vulnerability/scope badges under the selects. */
  showBadges?: boolean;
  /** Extra classes for the three-column select grid. */
  gridClassName?: string;
}

/**
 * Cascading geographic filter (province → county → city/district).
 *
 * Extracted so the workspace picker and the login gate drive the *same*
 * selection logic: choosing a location here re-scopes every dependent section
 * of the system, and on the login screen it also re-scopes the identity roster.
 */
export const LocationCascade: React.FC<LocationCascadeProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  showBadges = false,
  gridClassName = 'grid grid-cols-1 sm:grid-cols-3 gap-3',
}) => {
  const provinces = useMemo(() => Array.from(new Set(locations.map((l) => l.province))), [locations]);

  const availableCounties = useMemo(
    () =>
      Array.from(
        new Set(
          locations.filter((l) => l.province === selectedLocation.province).map((l) => l.county)
        )
      ),
    [locations, selectedLocation.province]
  );

  const availableDistricts = useMemo(
    () =>
      locations.filter(
        (l) => l.province === selectedLocation.province && l.county === selectedLocation.county
      ),
    [locations, selectedLocation.province, selectedLocation.county]
  );

  const handleProvinceChange = (province: string) => {
    const match = locations.find((l) => l.province === province);
    if (match) onSelectLocation(match);
  };

  const handleCountyChange = (county: string) => {
    const match = locations.find(
      (l) => l.province === selectedLocation.province && l.county === county
    );
    if (match) onSelectLocation(match);
  };

  const handleDistrictChange = (id: string) => {
    const match = locations.find((l) => l.id === id);
    if (match) onSelectLocation(match);
  };

  const selectClass =
    'w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer shadow-2xs';

  return (
    <div className="space-y-4" dir="rtl">
      <div id="location-cascade-fields" className={gridClassName}>
        <div id="location-cascade-province" className="flex flex-col text-right">
          <label className="text-[10px] text-slate-500 font-bold mb-1 mr-1">استان هدف</label>
          <select
            value={selectedLocation.province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className={selectClass}
          >
            {provinces.map((prov) => (
              <option key={prov} value={prov} className="bg-white text-slate-800">
                استان {prov}
              </option>
            ))}
          </select>
        </div>

        <div id="location-cascade-county" className="flex flex-col text-right">
          <label className="text-[10px] text-slate-500 font-bold mb-1 mr-1">شهرستان</label>
          <select
            value={selectedLocation.county}
            onChange={(e) => handleCountyChange(e.target.value)}
            className={selectClass}
          >
            {availableCounties.map((cnt) => (
              <option key={cnt} value={cnt} className="bg-white text-slate-800">
                {cnt.startsWith('شهرستان') ? cnt : `شهرستان ${cnt}`}
              </option>
            ))}
          </select>
        </div>

        <div id="location-cascade-district" className="flex flex-col text-right">
          <label className="text-[10px] text-slate-500 font-bold mb-1 mr-1">
            شهر / بخش / منطقه هدف
          </label>
          <select
            value={selectedLocation.id}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full bg-blue-50/60 hover:bg-blue-50 border border-blue-300 text-blue-900 font-black text-xs rounded-xl px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer shadow-xs"
          >
            {availableDistricts.map((d) => (
              <option key={d.id} value={d.id} className="bg-white text-slate-800 font-medium">
                {d.city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showBadges && (
        <div id="location-cascade-badges" className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
            <div className="text-[10px] text-slate-500">جمعیت تحت پوشش</div>
            <div className="text-xs font-bold text-slate-800">
              {toPersianDigits(selectedLocation.population.toLocaleString('fa-IR'))} نفر
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
            <div className="text-[10px] text-slate-500">آسیب‌پذیری منطقه</div>
            <div className="text-xs font-extrabold text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>
                {toPersianDigits(selectedLocation.indicators.overallVulnerabilityScore || 45)} از ۱۰۰
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-right">
            <div className="text-[10px] text-slate-500">شرح بخش / منطقه</div>
            <div className="text-xs font-bold text-slate-800">{selectedLocation.district}</div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-right flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-700">
              {selectedLocation.province} - {selectedLocation.county} - {selectedLocation.city}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
