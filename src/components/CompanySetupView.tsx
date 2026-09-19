import React, { useState, useEffect, useMemo } from 'react';
import { OrganizationConfig, OrgType, BudgetPeriod, LocationData } from '../types';
import { formatLargeBudgetPersian, formatCurrency, toPersianDigits } from '../utils/numberUtils';
import { Building2, Save, MapPin, DollarSign, Calendar, Layers, CheckCircle2 } from 'lucide-react';

interface CompanySetupViewProps {
  orgConfig: OrganizationConfig;
  locations?: LocationData[];
  onSelectLocation?: (loc: LocationData) => void;
  onSave: (updated: OrganizationConfig) => void;
}

export const CompanySetupView: React.FC<CompanySetupViewProps> = ({
  orgConfig,
  locations = [],
  onSelectLocation,
  onSave,
}) => {
  const [name, setName] = useState(orgConfig.name);
  const [orgType, setOrgType] = useState<OrgType>(orgConfig.orgType);
  const [activitySector, setActivitySector] = useState(orgConfig.activitySector);
  const [totalBudget, setTotalBudget] = useState(orgConfig.totalBudget);
  const [province, setProvince] = useState(orgConfig.province);
  const [county, setCounty] = useState(orgConfig.county);
  const [district, setDistrict] = useState(orgConfig.district);
  const [fiscalYear, setFiscalYear] = useState(orgConfig.fiscalYear);
  const [description, setDescription] = useState(orgConfig.description || '');

  useEffect(() => {
    setName(orgConfig.name);
    setTotalBudget(orgConfig.totalBudget);
    setProvince(orgConfig.province);
    setCounty(orgConfig.county);
    setDistrict(orgConfig.district);
  }, [orgConfig]);

  // Unique lists from locations dataset
  const availableProvinces = useMemo(() => {
    return Array.from(new Set(locations.map((l) => l.province)));
  }, [locations]);

  const availableCounties = useMemo(() => {
    return Array.from(
      new Set(locations.filter((l) => l.province === province).map((l) => l.county))
    );
  }, [locations, province]);

  const availableDistricts = useMemo(() => {
    return locations.filter((l) => l.province === province && l.county === county);
  }, [locations, province, county]);

  const handleProvinceSelect = (newProv: string) => {
    setProvince(newProv);
    const firstMatch = locations.find((l) => l.province === newProv);
    if (firstMatch) {
      setCounty(firstMatch.county);
      setDistrict(firstMatch.district);
      if (onSelectLocation) onSelectLocation(firstMatch);
    }
  };

  const handleCountySelect = (newCounty: string) => {
    setCounty(newCounty);
    const match = locations.find((l) => l.province === province && l.county === newCounty);
    if (match) {
      setDistrict(match.district);
      if (onSelectLocation) onSelectLocation(match);
    }
  };

  const handleDistrictSelect = (locationId: string) => {
    const match = locations.find((l) => l.id === locationId);
    if (match) {
      setProvince(match.province);
      setCounty(match.county);
      setDistrict(match.district);
      if (onSelectLocation) onSelectLocation(match);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...orgConfig,
      name,
      orgType,
      activitySector,
      totalBudget,
      province,
      county,
      district,
      fiscalYear,
      description,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div id="company-setup-view-root" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs max-w-4xl mx-auto space-y-6 dir-rtl">
      <div id="company-setup-view-div-2" className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          تنظیمات مشخصات شرکت/نهاد و بودجه کل CSR
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          اطلاعات پایه مربوط به هلدینگ/شرکت، سال مالی و میزان بودجه مصوب مسئولیت اجتماعی را وارد نمایید
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        
        {/* Org Basic Info */}
        <div id="company-setup-view-org-basic-info" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="company-setup-view-org-basic-info-2">
            <label className="block text-slate-700 font-bold mb-1">نام کامل شرکت / سازمان</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div id="company-setup-view-org-basic-info-3">
            <label className="block text-slate-700 font-bold mb-1">نوع سازمان</label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value as OrgType)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="PUBLIC">عمومی / شبه دولتی</option>
              <option value="PRIVATE">خصوصی</option>
              <option value="GOVERNMENT">دولتی</option>
            </select>
          </div>

          <div id="company-setup-view-org-basic-info-4">
            <label className="block text-slate-700 font-bold mb-1">حوزه اصلی فعالیت صنعت</label>
            <input
              type="text"
              value={activitySector}
              onChange={(e) => setActivitySector(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div id="company-setup-view-org-basic-info-5">
            <label className="block text-slate-700 font-bold mb-1">دوره/سال مالی مصوب</label>
            <input
              type="text"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Budget Definition */}
        <div id="company-setup-view-budget-definition" className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
          <label className="block text-slate-900 font-extrabold text-sm">
            بودجه کل مسئولیت اجتماعی (به تومان)
          </label>
          
          <input
            type="number"
            required
            step="1000000"
            value={totalBudget}
            onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
            className="w-full text-lg font-mono font-bold px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-900"
          />

          <div id="company-setup-view-budget-definition-2" className="p-3 bg-blue-100/60 rounded-xl text-blue-900 border border-blue-200 flex items-center justify-between">
            <span className="font-semibold">معادل حروفی مالی:</span>
            <strong className="text-sm dir-rtl">{formatLargeBudgetPersian(totalBudget)}</strong>
          </div>
        </div>

        {/* Location Definition (Dynamic Active Selectors) */}
        <div id="company-setup-view-location-definition-dynamic" className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
          <div id="company-setup-view-location-definition-dynamic-2" className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              موقعیت جغرافیایی و منطقه همجوار سازمان
            </span>
            <span className="text-[10px] text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full font-bold">
              متصل به شاخص‌های استانی
            </span>
          </div>

          <div id="company-setup-view-location-definition-dynamic-3" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Province selector */}
            <div id="company-setup-view-province-selector">
              <label className="block text-slate-700 font-bold mb-1">استان اصلی همجوار</label>
              {availableProvinces.length > 0 ? (
                <select
                  value={province}
                  onChange={(e) => handleProvinceSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-bold"
                >
                  {availableProvinces.map((p) => (
                    <option key={p} value={p}>
                      استان {p}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* County selector */}
            <div id="company-setup-view-county-selector">
              <label className="block text-slate-700 font-bold mb-1">شهرستان / شهر</label>
              {availableCounties.length > 0 ? (
                <select
                  value={county}
                  onChange={(e) => handleCountySelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-bold"
                >
                  {availableCounties.map((c) => (
                    <option key={c} value={c}>
                      شهرستان {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* District / Neighborhood selector */}
            <div id="company-setup-view-district-neighborhood-selector">
              <label className="block text-slate-700 font-bold mb-1">منطقه / محله هدف</label>
              {availableDistricts.length > 0 ? (
                <select
                  value={
                    locations.find(
                      (l) => l.province === province && l.county === county && l.district === district
                    )?.id || availableDistricts[0]?.id || ''
                  }
                  onChange={(e) => handleDistrictSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white font-bold"
                >
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.city} ({d.district})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>
        </div>

        <div id="company-setup-view-district-neighborhood-selector-2">
          <label className="block text-slate-700 font-bold mb-1">توضیحات و مصوبه مجمع عمومی</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div id="company-setup-view-district-neighborhood-selector-3" className="flex justify-end pt-3 border-t">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>ذخیره تغییرات سازمان و بودجه</span>
          </button>
        </div>

      </form>
    </div>
  );
};

