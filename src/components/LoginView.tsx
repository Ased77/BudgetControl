import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  KeyRound,
  LogIn,
  AlertTriangle,
  Loader2,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  ArrowUpLeft,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  Network,
  History,
  Pause,
  Play,
} from 'lucide-react';
// === Dev Seed Login (disposable dev helper): import + render below live together —
// delete both halves of this comment block to remove the feature. ===
import { DevSeedLoginPanel } from './DevSeedLoginPanel';
import './LoginView.css';

/**
 * Access gate for the national development system.
 *
 * This is real authentication: the mobile-number/password pair is verified
 * server-side, and the session lives in httpOnly cookies the browser can
 * neither read nor forge. Success means one thing only — an auth_users.id
 * (the verified user_id) that every API call on the way forward exposes
 * (as `req.auth.userId`) and every business row references. The previous
 * identity-picker ("signing in" by choosing a persona) is gone: without
 * credentials there is no session, and without a session the API answers
 * 401 to every user-data call.
 *
 * There is NO self-registration: accounts are provisioned exclusively by
 * an admin in the role & permission manager. This gate is login-only.
 */

/** How long each showcase slide stays on screen before the next one. */
const SHOWCASE_INTERVAL_MS = 8000;

/**
 * The four statements the login showcase rotates through. The copy is the
 * system's own promise in four beats: one integrated platform, a sealed
 * session, role-shaped authority and an auditable trail of every change.
 */
const SHOWCASE_SLIDES = [
  {
    id: 'integrated-platform',
    label: 'یکپارچگی ملی',
    icon: Network,
    text: 'سامانه یکپارچه اولویت‌سنجی پروژه‌ها، بهینه‌سازی منابع مالی و بودجه‌ای، مدیریت ادارات و پیمانکاران و پیشگیری هوشمند از موازی‌کاری در سطوح ملی، استانی، شهرستانی و روستایی.',
  },
  {
    id: 'session-security',
    label: 'احراز هویت رمزنامه‌ای',
    icon: ShieldCheck,
    text: 'احراز هویت رمزنامه‌ای؛ نشست شما در کوکی‌های امنِ غیرقابل‌خواندن برای اسکریپت‌ها ذخیره می‌شود',
  },
  {
    id: 'role-based-access',
    label: 'دسترسی مبتنی بر نقش',
    icon: KeyRound,
    text: 'دسترسی مبتنی بر نقش (RBAC) با سطوح اختیارات تفکیک‌شده و اعتبارسنجی سمت سرور',
  },
  {
    id: 'audit-trail',
    label: 'تاریخچه نظارتی',
    icon: History,
    text: 'تمام تغییرات با شناسه تأییدشده اپراتور در تاریخچه نظارتی ثبت می‌شود',
  },
] as const;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const toPersianDigits = (value: string | number): string =>
  String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);

const formatSlideNumber = (value: number): string => toPersianDigits(String(value).padStart(2, '0'));

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [showcasePaused, setShowcasePaused] = useState(false);
  const [showcaseRun, setShowcaseRun] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const swipeStartX = useRef<number | null>(null);

  // Autoplay is an enhancement, never a requirement: honouring the OS motion
  // preference stops the rotation (and the progress animation with it).
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setReducedMotion(query.matches);
    syncPreference();
    query.addEventListener('change', syncPreference);
    return () => query.removeEventListener('change', syncPreference);
  }, []);

  // Every restart of playback gets a new run id so the progress bar and the
  // timeout are re-armed from zero together instead of drifting apart.
  useEffect(() => {
    if (!showcasePaused) setShowcaseRun((run) => run + 1);
  }, [showcasePaused]);

  useEffect(() => {
    if (showcasePaused || reducedMotion) return;
    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % SHOWCASE_SLIDES.length);
    }, SHOWCASE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [activeSlide, showcasePaused, reducedMotion, showcaseRun]);

  const goToSlide = useCallback((index: number) => {
    const count = SHOWCASE_SLIDES.length;
    setActiveSlide(((index % count) + count) % count);
  }, []);

  const stepSlide = useCallback((direction: number) => {
    const count = SHOWCASE_SLIDES.length;
    setActiveSlide((current) => (current + direction + count) % count);
  }, []);

  // RTL reading order: the left arrow advances, the right one goes back.
  const handleShowcaseKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stepSlide(1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stepSlide(-1);
    }
  };

  const handleShowcaseTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    swipeStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleShowcaseTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = swipeStartX.current;
    swipeStartX.current = null;
    if (startX === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(delta) < 40) return;
    stepSlide(delta < 0 ? 1 : -1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(mobile.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص در ورود');
    } finally {
      setBusy(false);
    }
  };

  const activeShowcaseSlide = SHOWCASE_SLIDES[activeSlide];
  const ActiveShowcaseIcon = activeShowcaseSlide.icon;

  return (
    <main id="login-view-root" className="login-shell" dir="rtl">
      <div className="login-card" dir="ltr">
        <section className="login-form-panel" dir="rtl">
          <header className="login-brand">
            <span className="login-brand-mark" aria-hidden="true"><Landmark /></span>
            <span>
              <strong>سامانه توسعه ملی</strong>
              <small>مدیریت هوشمند توسعه روستایی و شهری</small>
            </span>
          </header>

          <div className="login-content">
            <div className="login-heading">
              <span className="login-eyebrow">پنل مدیریت و برنامه‌ریزی</span>
              <h1>به سامانه خوش آمدید</h1>
              <p>برای ادامه، با حساب کاربری سازمانی خود وارد شوید.</p>
            </div>

            <form id="login-view-credentials" onSubmit={handleSubmit} className="login-form">
              <label className="login-field">
                <span>شماره موبایل سازمانی</span>
                <span className="login-input-wrap" dir="ltr">
                  <Smartphone aria-hidden="true" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="09xxxxxxxxx"
                    aria-label="شماره موبایل سازمانی"
                  />
                </span>
              </label>

              <label className="login-field">
                <span>رمز عبور</span>
                <span className="login-input-wrap" dir="ltr">
                  <Lock aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="رمز عبور خود را وارد کنید"
                    aria-label="رمز عبور"
                  />
                  <button
                    className="login-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                    title={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                  >
                    {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  </button>
                </span>
              </label>

              {error && (
                <div id="login-view-error" className="login-error" role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={busy} className="login-submit">
                {busy ? <Loader2 className="login-spinner" aria-hidden="true" /> : <LogIn aria-hidden="true" />}
                {busy ? 'در حال ورود...' : 'ورود به سامانه'}
                {!busy && <ArrowUpLeft className="login-submit-arrow" aria-hidden="true" />}
              </button>

              <p className="login-security-note">
                <ShieldCheck aria-hidden="true" />
                نشست شما با اتصال امن و کوکی‌های محافظت‌شده نگهداری می‌شود.
              </p>
            </form>

            <DevSeedLoginPanel onFill={(username, password) => {
              setMobile(username);
              setPassword(password);
            }} />
          </div>

          <footer className="login-footer">
            <span>ثبت‌نام فقط از طریق مدیر سامانه انجام می‌شود.</span>
            <span className="login-footer-version">نسخه ۲.۰ · دوره مالی ۱۴۰۵–۱۴۰۶</span>
          </footer>
        </section>

        <aside className="login-showcase" dir="rtl">
          <div className="showcase-grid" aria-hidden="true" />
          <div className="showcase-glow showcase-glow-one" aria-hidden="true" />
          <div className="showcase-glow showcase-glow-two" aria-hidden="true" />

          <div className="showcase-topline">
            <span className="showcase-status"><i /> داشبورد یکپارچه</span>
            <span className="showcase-period">۱۴۰۵–۱۴۰۶</span>
          </div>

          <div className="showcase-dashboard" aria-label="پیش‌نمایش تصویری داشبورد مالی">
            <div className="showcase-summary-card">
              <div className="showcase-card-heading">
                <span className="showcase-card-icon"><CircleDollarSign aria-hidden="true" /></span>
                <span><small>نمای کلی بودجه</small><strong>تخصیص منابع</strong></span>
                <span className="showcase-trend">+۱۲٪</span>
              </div>
              <div className="showcase-budget">
                <strong>۷۶٪</strong>
                <span>از بودجه مصوب</span>
              </div>
              <div className="showcase-progress"><span /></div>
              <div className="showcase-card-foot"><span>مصوب</span><b>در حال اجرا</b><span>باقی‌مانده</span></div>
            </div>

            <div className="showcase-chart-card">
              <div className="showcase-chart-title">
                <span><small>تحلیل عملکرد</small><strong>روند تخصیص بودجه</strong></span>
                <ChartNoAxesCombined aria-hidden="true" />
              </div>
              <div className="showcase-chart">
                <div className="showcase-chart-lines" aria-hidden="true" />
                <svg viewBox="0 0 300 98" role="presentation" aria-hidden="true">
                  <defs>
                    <linearGradient id="budget-chart-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#40d5c5" stopOpacity=".34" />
                      <stop offset="100%" stopColor="#40d5c5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 78 C32 74 39 52 72 60 S112 52 142 43 S176 50 205 31 S251 36 300 8 V98 H0Z" fill="url(#budget-chart-fill)" />
                  <path d="M0 78 C32 74 39 52 72 60 S112 52 142 43 S176 50 205 31 S251 36 300 8" fill="none" stroke="#58ded0" strokeWidth="3" />
                  <circle cx="205" cy="31" r="4" fill="#fff" stroke="#58ded0" strokeWidth="3" />
                </svg>
              </div>
              <div className="showcase-months"><span>فروردین</span><span>خرداد</span><span>شهریور</span><span>آذر</span></div>
            </div>

            <div className="showcase-mini-card">
              <span className="showcase-mini-icon"><Landmark aria-hidden="true" /></span>
              <span><small>پروژه‌های فعال</small><strong>۲۴۸ <em>پروژه</em></strong></span>
              <span className="showcase-mini-badge">+۸.۴٪</span>
            </div>
          </div>

          <div
            className="showcase-slider"
            role="group"
            aria-roledescription="اسلایدر"
            aria-label="معرفی سامانه"
            tabIndex={0}
            onKeyDown={handleShowcaseKeyDown}
            onTouchStart={handleShowcaseTouchStart}
            onTouchEnd={handleShowcaseTouchEnd}
          >
            <div className="showcase-slides" aria-live={showcasePaused ? 'polite' : 'off'}>
              <article
                key={activeShowcaseSlide.id}
                className="showcase-slide"
                aria-roledescription="اسلاید"
                aria-label={`اسلاید ${toPersianDigits(activeSlide + 1)} از ${toPersianDigits(SHOWCASE_SLIDES.length)}`}
              >
                <div className="showcase-slide-meta">
                  <span className="showcase-slide-icon" aria-hidden="true"><ActiveShowcaseIcon /></span>
                  <span className="showcase-slide-count" dir="ltr" aria-hidden="true">
                    <b>{formatSlideNumber(activeSlide + 1)}</b> / {formatSlideNumber(SHOWCASE_SLIDES.length)}
                  </span>
                </div>
                <p className="showcase-slide-text">{activeShowcaseSlide.text}</p>
              </article>
            </div>

            <div className={`showcase-pagination${showcasePaused ? ' is-paused' : ''}`}>
              <div className="showcase-dots">
                {SHOWCASE_SLIDES.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`showcase-dot${index === activeSlide ? ' is-active' : ''}`}
                    aria-label={`${slide.label} — اسلاید ${toPersianDigits(index + 1)}`}
                    aria-current={index === activeSlide ? 'true' : undefined}
                    onClick={() => goToSlide(index)}
                  >
                    <span className="showcase-dot-track" aria-hidden="true">
                      <span
                        className="showcase-dot-fill"
                        key={`${index}-${activeSlide}-${showcaseRun}`}
                        style={{ animationDuration: `${SHOWCASE_INTERVAL_MS}ms` }}
                      />
                    </span>
                  </button>
                ))}
              </div>
              {!reducedMotion && (
                <button
                  type="button"
                  className="showcase-playback"
                  onClick={() => setShowcasePaused((paused) => !paused)}
                  aria-label={showcasePaused ? 'پخش خودکار اسلایدها' : 'توقف پخش خودکار اسلایدها'}
                  title={showcasePaused ? 'پخش خودکار' : 'توقف پخش خودکار'}
                >
                  {showcasePaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
};
