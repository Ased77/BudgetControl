import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  KeyRound,
  LogIn,
  UserPlus,
  AlertTriangle,
  Sparkles,
  Loader2,
  Mail,
  Lock,
  User,
} from 'lucide-react';

/**
 * Access gate for the national development system.
 *
 * This is real authentication: the email/password pair is verified
 * server-side, and the session lives in httpOnly cookies the browser can
 * neither read nor forge. Success means one thing only — an auth_users.id
 * (the verified user_id) that every API call on the way forward exposes
 * (as `req.auth.userId`) and every business row references. The previous
 * identity-picker ("signing in" by choosing a persona) is gone: without
 * credentials there is no session, and without a session the API answers
 * 401 to every user-data call.
 */
export const LoginView: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص در ورود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id="login-view-root"
      dir="rtl"
      className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-white to-indigo-50 flex items-stretch lg:items-center justify-center lg:p-8"
    >
      <div id="login-view-div-2" className="w-full max-w-4xl bg-white lg:rounded-3xl lg:shadow-2xl lg:border lg:border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
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
                <span>احراز هویت رمزنامه‌ای؛ نشست شما در کوکی‌های امنِ غیرقابل‌خواندن برای اسکریپت‌ها ذخیره می‌شود</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-blue-50/90">
                <KeyRound className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>دسترسی مبتنی بر نقش (RBAC) با سطوح اختیارات تفکیک‌شده و اعتبارسنجی سمت سرور</span>
              </li>
              <li className="flex items-start gap-3 text-xs text-blue-50/90">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تمام تغییرات با شناسه تأییدشده اپراتور در تاریخچه نظارتی ثبت می‌شود</span>
              </li>
            </ul>
          </div>

          <div id="login-view-brand-column-7" className="relative flex items-center gap-2 text-[10px] text-blue-100/70 border-t border-white/15 pt-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نسخه ۲.۰ — دوره مالی ۱۴۰۵ الی ۱۴۰۶</span>
          </div>
        </aside>

        {/* ---------------- Credentials ---------------- */}
        <section className="p-6 lg:p-10 flex flex-col justify-center">
          <div id="login-view-credentials" className="mb-6">
            <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <LogIn className="w-6 h-6 text-blue-600" />
              ورود به سامانه
            </h2>
            <p className="text-slate-600 text-xs mt-2 leading-relaxed">
              ایمیل سازمانی و رمز عبور خود را وارد کنید. سطح دسترسی، اختیارات ویرایش و
              گزارش‌های در دسترس بر اساس نقش تأییدشدهٔ حساب شما سمت سرور تعیین می‌شود.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <label className="block">
                <span className="block text-[11px] font-bold text-slate-700 mb-1.5">نام نمایشی</span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    minLength={2}
                    dir="rtl"
                    placeholder="نام و نام خانوادگی"
                    className="w-full py-2.5 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="block text-[11px] font-bold text-slate-700 mb-1.5">ایمیل سازمانی</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  dir="ltr"
                  placeholder="name@agency.gov"
                  className="w-full py-2.5 bg-transparent text-sm outline-none text-left"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-[11px] font-bold text-slate-700 mb-1.5">رمز عبور</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  dir="ltr"
                  placeholder="••••••••"
                  className="w-full py-2.5 bg-transparent text-sm outline-none text-left"
                />
              </div>
              {mode === 'register' && (
                <span className="mt-1 block text-[10px] text-slate-500">رمز عبور باید حداقل ۸ نویسه باشد.</span>
              )}
            </label>

            {error && (
              <div id="login-view-error" className="flex items-start gap-2 text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
                busy
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25'
              }`}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {mode === 'login' ? 'ورود به سامانه' : 'ثبت‌نام و ورود'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === 'login' ? 'register' : 'login'));
                setError(null);
              }}
              className="w-full text-[11px] text-slate-500 hover:text-blue-600 transition-colors py-1"
            >
              {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام' : 'حساب دارید؟ بازگشت به ورود'}
            </button>

            <div id="login-view-note" className="flex items-start gap-2 text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                نشست پس از ورود با توکن کوتاه‌عمر (۱۵ دقیقه) و توکن تمدید (۳۰ روز) در کوکی‌های
                httponly نگه داشته می‌شود؛ کد سمت مرورگر هرگز به آن‌ها دسترسی ندارد و سالخوردگی
                نشست به‌صورت خودکار و بدون وقفهٔ کاربر تمدید می‌گردد.
              </span>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
