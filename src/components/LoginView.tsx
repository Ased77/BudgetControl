import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { toPersianDigits } from '../utils/numberUtils';
import { LocationCascade } from './LocationCascade';
import {
  ShieldCheck,
  KeyRound,
  MapPin,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Globe,
} from 'lucide-react';

/**
 * Access gate for the national development system.
 *
 * This app has no user store, no password and no server session: identities are
 * the organizational personas seeded per county, and "signing in" selects one of
 * them (the same switch the header dropdown and the نقش‌ها tab expose). Because
 * the roster is location-scoped, the gate opens with the same cascading
 * province → county → city filter as the workspace picker, so an operator signs
 * in from — and into — the county they actually serve. The screen says so
 * plainly instead of pretending to authenticate — see the warning panel below.
 * Real authentication would need a server session.
 */
export const LoginView: React.FC = () => {
  const { users, login, locations, selectedLocation, handleSelectLocation } = useAppContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Remote avatars can fail (offline, blocked host); fall back to initials.
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  // Changing the geographic scope swaps the roster; drop a selection that no
  // longer belongs to the newly selected county so the submit button can never
  // carry an identity from another location.
  useEffect(() => {
    if (selectedId && !users.some((u) => u.id === selectedId)) {
      setSelectedId(null);
    }
  }, [users, selectedId]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedUser) {
      login(selectedUser.id);
    }
  };

  const moveSelection = (delta: number) => {
    if (users.length === 0) return;
    const currentIndex = users.findIndex((u) => u.id === selectedId);
    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : users.length - 1
        : (currentIndex + delta + users.length) % users.length;
    setSelectedId(users[nextIndex].id);
  };

  const handleGroupKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(-1);
    }
  };

  return (
    <div
      id="login-view-root"
      dir="rtl"
      className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-stretch lg:items-center justify-center lg:p-8"
    >
      <div id="login-view-div-2" className="w-full max-w-6xl bg-white lg:rounded-3xl lg:shadow-2xl lg:border lg:border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
        {/* ---------------- Brand column ---------------- */}
        <aside className="relative bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-900 text-white p-8 lg:p-10 flex flex-col justify-between gap-10 overflow-hidden">
          <div id="login-view-brand-column" className="absolute -top-24 -left-24 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
          <div id="login-view-brand-column-2" className="absolute -bottom-28 -right-16 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

          <div id="login-view-brand-column-3" className="relative space-y-6">
            <div id="login-view-brand-column-4" className="flex items-center gap-3">
              <div id="login-view-brand-column-5" className="w-12 h-12 bg-white/15 border border-white/25 backdrop-blur-sm rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-lg">
                ملی
              </div>
              <div id="login-view-brand-column-6">
                <h1 className="font-black text-lg tracking-tight">سامانه توسعه ملی</h1>
                <p className="text-[11px] text-blue-100/80">مدیریت هوشمند توسعه روستایی و شهری</p>
              </div>
            </div>

            <p className="text-sm text-blue-50/90 leading-relaxed max-w-sm">
              سامانه یکپارچه اولویت‌سنجی پروژه‌ها، بهینه‌سازی منابع مالی و بودجه‌ای، مدیریت ادارات و
              پیمانکاران و پیشگیری هوشمند از موازی‌کاری در سطوح ملی، استانی، شهرستانی و روستایی.
            </p>

            <ul className="space-y-3 pt-2">
              <li className="flex items-start gap-3 text-xs text-blue-50/90">
                <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>شفافیت کامل تخصیص اعتبارات و ردگیری تمامی تغییرات در تاریخچه نظارتی</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-blue-50/90">
                <KeyRound className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>دسترسی مبتنی بر نقش (RBAC) با سطوح اختیارات تفکیک‌شده برای هر نقش</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-blue-50/90">
                <MapPin className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                <span>پایش شاخص‌های مکانی محرومیت و هشدار هوشمند موازی‌کاری پروژه‌ها</span>
              </li>
            </ul>
          </div>

          <div id="login-view-brand-column-7" className="relative flex items-center gap-2 text-[10px] text-blue-100/70 border-t border-white/15 pt-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نسخه ۲.۰ — دوره مالی ۱۴۰۵ الی ۱۴۰۶</span>
          </div>
        </aside>

        {/* ---------------- Identity selection ---------------- */}
        <section className="p-6 lg:p-10 flex flex-col justify-center">
          <div id="login-view-identity-selection" className="mb-6">
            <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <LogIn className="w-6 h-6 text-blue-600" />
              ورود به سامانه
            </h2>
            <p className="text-slate-600 text-xs mt-2 leading-relaxed">
              برای ورود، حوزه جغرافیایی خدمت و سپس هویت سازمانی خود را انتخاب کنید. سطح دسترسی،
              اختیارات ویرایش و گزارش‌های در دسترس بر اساس نقش انتخابی تعیین می‌شود.
            </p>
            <span className="inline-block mt-3 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
              {toPersianDigits(users.length)} هویت سازمانی فعال در {selectedLocation.county}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Geographic scope of the session — drives the identity roster below */}
            <div
              id="login-view-geographic-scope"
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg border border-blue-200 shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-900">حوزه جغرافیایی خدمت</h3>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                    استان، شهرستان و شهر/بخش محل ورود را انتخاب کنید؛ فهرست هویت‌های سازمانی و تمام
                    بخش‌های وابسته سامانه بر همین اساس به‌روزرسانی می‌شود.
                  </p>
                </div>
              </div>
              <LocationCascade
                locations={locations}
                selectedLocation={selectedLocation}
                onSelectLocation={handleSelectLocation}
              />
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>
                  ورود به عنوان ناحیه: {selectedLocation.province} — {selectedLocation.county} —{' '}
                  {selectedLocation.city}
                </span>
              </div>
            </div>

            <div
              id="login-view-identity-selection-2"
              role="radiogroup"
              aria-label="انتخاب هویت سازمانی"
              onKeyDown={handleGroupKeyDown}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {users.map((user) => {
                const isSelected = user.id === selectedId;
                return (
                  <button
                    key={user.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedId(user.id)}
                    className={`text-right p-3 rounded-2xl border transition-all flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    {brokenAvatars[user.id] ? (
                      <span className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {user.name.charAt(0)}
                      </span>
                    ) : (
                      <img
                        src={user.avatar}
                        alt=""
                        onError={() =>
                          setBrokenAvatars((prev) => ({ ...prev, [user.id]: true }))
                        }
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {user.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        )}
                      </span>
                      <span
                        className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                          isSelected
                            ? 'bg-white text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {user.roleFa}
                      </span>
                      <span className="block mt-1 text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                        {user.organization}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedUser && (
              <div id="login-view-identity-selection-3" className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                ورود به عنوان <strong className="text-slate-900">{selectedUser.name}</strong> —{' '}
                <span className="text-slate-700">{selectedUser.roleTitleFa}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedUser}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
                selectedUser
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <LogIn className="w-4 h-4" />
              {selectedUser ? 'ورود به سامانه' : 'برای ادامه یک هویت را انتخاب کنید'}
            </button>

            <div id="login-view-identity-selection-4" className="flex items-start gap-2 text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                این صفحه دروازه شبیه‌سازی دسترسی سازمانی است؛ رمز عبور و احراز هویت واقعی در سامانه
                فعال نیست و انتخاب هویت تنها برای نمایش سطح دسترسی نقش‌ها کاربرد دارد.
              </span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
