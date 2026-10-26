import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  Network,
  History,
  Pause,
  Play,
  FlaskConical,
} from 'lucide-react';
// === Dev Seed Login (disposable dev helper): import + render below live together —
// delete both halves of this comment block to remove the feature. ===
import { DevSeedLoginPanel } from './DevSeedLoginPanel';
import './LoginView.css';

/**
 * Access gate for the national development system.
 *
 * This is real authentication in two steps: the mobile number receives a
 * short-lived one-time code, and only a correct code mints a session. The
 * session lives in httpOnly cookies the browser can neither read nor forge.
 * Success means one thing only — an auth_users.id (the verified user_id)
 * that every API call on the way forward exposes (as `req.auth.userId`) and
 * every business row references.
 *
 * The verification code is delivered by a FAKE channel for now: no SMS
 * provider is connected, so the server hands the generated code back as
 * `devCode` (AUTH_OTP_FAKE_DELIVERY=1, the default) and this screen shows it
 * in a clearly marked dev box. The challenge itself is real — hashed at rest,
 * single-use, short-lived and attempt-capped — so wiring an SMS provider only
 * replaces the delivery step.
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

/** The segmented mobile field holds exactly this many digits. */
const MOBILE_DIGITS = 11;

/** One-time-code cells. Mirrors server/auth/otp.ts (OTP_CODE_LENGTH). */
const OTP_DIGITS = 6;

/** The fixed local head: two prefilled cells the user cannot edit. */
const MOBILE_PREFIX = '09';
const MOBILE_PREFIX_LEN = 2;

/** Persian (۰-۹) and Arabic (٠-٩) numerals in, Latin digits out. */
const toLatinDigits = (raw: string): string => raw
  .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
  .replace(/[^0-9]/g, '');

/**
 * Mobile number as typed or pasted in whatever disguise — Latin digits, Persian
 * numerals, an international "+98 …" prefix — reduced to the plain 11-digit
 * local form the server expects.
 */
const normalizeMobileDigits = (raw: string): string => {
  let digits = toLatinDigits(raw);
  if (digits.startsWith('0098')) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith('98') && digits.length >= 12) digits = `0${digits.slice(2)}`;
  return digits.slice(0, MOBILE_DIGITS);
};

/** Replace (or, past the current end, append) the digit at a cell index. */
const setMobileDigitAt = (value: string, index: number, digit: string): string => {
  const chars = value.split('');
  while (chars.length <= index) chars.push('');
  chars[index] = digit;
  return chars.join('');
};

/** Remove the digit at a cell index; anything after it slides left. */
const removeMobileDigitAt = (value: string, index: number): string => {
  const chars = value.split('');
  chars.splice(index, 1);
  return chars.join('');
};

/**
 * Fold a normalized number into the `mobile` string, which always carries the
 * fixed `09` head: prefixed numbers pass through, bare nine-digit locals gain
 * the head, and a lone leading 9 gets the missing zero.
 */
const withMobilePrefix = (digits: string): string => {
  if (digits.startsWith(MOBILE_PREFIX)) return digits;
  if (digits.length === 0) return MOBILE_PREFIX;
  if (digits.length === MOBILE_DIGITS - MOBILE_PREFIX_LEN) return MOBILE_PREFIX + digits;
  return `0${digits}`;
};

type LoginStep = 'mobile' | 'code';

export const LoginView: React.FC = () => {
  const { requestOtp, verifyOtp, establishSession } = useAuth();
  // The `mobile` string always carries the fixed `09` head; the user types
  // only the nine digits that follow it.
  const [mobile, setMobile] = useState(MOBILE_PREFIX);
  const [step, setStep] = useState<LoginStep>('mobile');
  const [otp, setOtp] = useState('');
  // No SMS provider yet: the server returns the generated code so the dev
  // box can show it. Null when the backend has fake delivery turned off.
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  // The code verified this instant. Kept for a beat so the success state is
  // visible before the access gate swaps to the dashboard.
  const [verified, setVerified] = useState(false);
  // The last submission did not verify (wrong/expired code or an incomplete
  // entry). Cleared as soon as the user edits the code again.
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
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
      setSlideDirection(1);
      setActiveSlide((current) => (current + 1) % SHOWCASE_SLIDES.length);
    }, SHOWCASE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [activeSlide, showcasePaused, reducedMotion, showcaseRun]);

  const goToSlide = useCallback((index: number) => {
    const count = SHOWCASE_SLIDES.length;
    const nextIndex = ((index % count) + count) % count;
    if (nextIndex === activeSlide) return;
    const forwardDistance = (nextIndex - activeSlide + count) % count;
    setSlideDirection(forwardDistance <= count / 2 ? 1 : -1);
    setActiveSlide(nextIndex);
  }, [activeSlide]);

  const stepSlide = useCallback((direction: number) => {
    const count = SHOWCASE_SLIDES.length;
    setSlideDirection(direction);
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

  // --- Segmented mobile field: eleven cells with jump filling ---------------
  // Every cell is a real single-digit input, so native keyboards, paste and
  // IMEs keep working. The shared `mobile` string stays in Latin digits —
  // only what is rendered converts to Persian numerals. Typing a digit jumps
  // the caret into the next cell; backspace retreats over an empty cell.
  const mobileCellRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusMobileCell = useCallback((index: number) => {
    const cell = mobileCellRefs.current[
      Math.max(MOBILE_PREFIX_LEN, Math.min(MOBILE_DIGITS - 1, index))
    ];
    cell?.focus();
  }, []);

  const handleMobileCellChange = (index: number, raw: string) => {
    const digits = toLatinDigits(raw);
    if (digits.length === 0) {
      // The cell was emptied — its digit leaves the sequence.
      setMobile((prev) => removeMobileDigitAt(prev, index));
      return;
    }
    // More than one character in a cell means the trailing one was just typed.
    const digit = digits.slice(-1);
    setMobile((prev) => setMobileDigitAt(prev, index, digit));
    // Jump fill: the caret rides forward with every accepted digit.
    if (index < MOBILE_DIGITS - 1) focusMobileCell(index + 1);
  };

  const handleMobileCellKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (mobile[index]) {
        // Editing mid-sequence: drop this digit, the rest slide left.
        setMobile((prev) => removeMobileDigitAt(prev, index));
      } else if (index > MOBILE_PREFIX_LEN) {
        // Retreating over an empty cell deletes its predecessor — never the
        // fixed `09` head, which stays put.
        focusMobileCell(index - 1);
        setMobile((prev) => removeMobileDigitAt(prev, index - 1));
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusMobileCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusMobileCell(index + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusMobileCell(MOBILE_PREFIX_LEN);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusMobileCell(mobile.length);
    }
  };

  const handleMobileCellPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = normalizeMobileDigits(event.clipboardData.getData('text'));
    if (!digits) return;
    event.preventDefault();
    // A full `09…` number pasted into the first open cell must not double the
    // fixed head — shave the pasted prefix before merging.
    const pasted = index === MOBILE_PREFIX_LEN && digits.startsWith(MOBILE_PREFIX)
      ? digits.slice(MOBILE_PREFIX_LEN)
      : digits;
    setMobile((prev) => `${prev.slice(0, index)}${pasted}`.slice(0, MOBILE_DIGITS));
    focusMobileCell(Math.min(index + pasted.length, MOBILE_DIGITS - 1));
  };

  // --- Segmented one-time-code field ---------------------------------------
  // Same editing model as the mobile field: one real input per digit, so
  // typing, paste and native keyboards all behave; the caret rides forward.
  const otpCellRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusOtpCell = useCallback((index: number) => {
    const cell = otpCellRefs.current[
      Math.max(0, Math.min(OTP_DIGITS - 1, index))
    ];
    cell?.focus();
  }, []);

  const handleOtpCellChange = (index: number, raw: string) => {
    setCodeInvalid(false);
    const digits = toLatinDigits(raw);
    if (digits.length === 0) {
      setOtp((prev) => removeMobileDigitAt(prev, index));
      return;
    }
    const digit = digits.slice(-1);
    setOtp((prev) => setMobileDigitAt(prev, index, digit));
    if (index < OTP_DIGITS - 1) focusOtpCell(index + 1);
  };

  const handleOtpCellKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      setCodeInvalid(false);
      if (otp[index]) {
        setOtp((prev) => removeMobileDigitAt(prev, index));
      } else if (index > 0) {
        focusOtpCell(index - 1);
        setOtp((prev) => removeMobileDigitAt(prev, index - 1));
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusOtpCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusOtpCell(index + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOtpCell(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOtpCell(otp.length);
    }
  };

  const handleOtpCellPaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = toLatinDigits(event.clipboardData.getData('text')).slice(0, OTP_DIGITS);
    if (digits) setCodeInvalid(false);
    if (!digits) return;
    event.preventDefault();
    setOtp((prev) => `${prev.slice(0, index)}${digits}`.slice(0, OTP_DIGITS));
    focusOtpCell(Math.min(index + digits.length, OTP_DIGITS - 1));
  };

  // Resend cooldown: one timer per remaining second; the server enforces the
  // same limit, this only keeps the button honest in the browser.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  // The code step gets focus on the first cell as soon as it appears.
  useEffect(() => {
    if (step !== 'code') return;
    const timer = window.setTimeout(() => otpCellRefs.current[0]?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [step]);

  const startCodeStep = (challenge: { devCode?: string; resendAfterSeconds: number }) => {
    setStep('code');
    setOtp('');
    setVerified(false);
    setCodeInvalid(false);
    setDevCode(challenge.devCode ?? null);
    setResendIn(challenge.resendAfterSeconds);
    setNotice(`کد تأیید به شماره ${toPersianDigits(mobile)} ارسال شد.`);
  };

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (mobile.length < MOBILE_DIGITS) {
      setError(`شماره موبایل را با ${toPersianDigits(MOBILE_DIGITS)} رقم کامل وارد کنید.`);
      focusMobileCell(mobile.length);
      return;
    }
    setBusy(true);
    try {
      startCodeStep(await requestOtp(mobile));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص در ارسال کد');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (otp.length < OTP_DIGITS) {
      setError(`کد تأیید را با ${toPersianDigits(OTP_DIGITS)} رقم کامل وارد کنید.`);
      setCodeInvalid(true);
      focusOtpCell(otp.length);
      return;
    }
    setBusy(true);
    try {
      // Verification sets the httpOnly cookies but not the React session yet:
      // the green confirmation below gets a moment to be seen before the gate
      // hands over to the dashboard.
      const profile = await verifyOtp(mobile, otp);
      setCodeInvalid(false);
      setVerified(true);
      setBusy(false);
      await new Promise((resolve) => window.setTimeout(resolve, 1000));
      establishSession(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص در تأیید کد');
      setVerified(false);
      setCodeInvalid(true);
      setOtp('');
      setBusy(false);
      focusOtpCell(0);
    }
  };

  const handleResendCode = async () => {
    if (busy || resendIn > 0) return;
    setError(null);
    setBusy(true);
    try {
      const challenge = await requestOtp(mobile);
      setOtp('');
      setVerified(false);
      setCodeInvalid(false);
      setDevCode(challenge.devCode ?? null);
      setResendIn(challenge.resendAfterSeconds);
      setNotice(`کد تأیید تازه به شماره ${toPersianDigits(mobile)} ارسال شد.`);
      focusOtpCell(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای نامشخص در ارسال دوباره کد');
    } finally {
      setBusy(false);
    }
  };

  const handleEditMobile = () => {
    setStep('mobile');
    setOtp('');
    setVerified(false);
    setCodeInvalid(false);
    setDevCode(null);
    setResendIn(0);
    setNotice(null);
    setError(null);
    window.setTimeout(() => focusMobileCell(mobile.length), 60);
  };

  const activeShowcaseSlide = SHOWCASE_SLIDES[activeSlide];
  const ActiveShowcaseIcon = activeShowcaseSlide.icon;

  // One character slot per cell; holes are impossible because deletions slide
  // the tail left, so cell N is either digit N or empty.
  const mobileCells = Array.from({ length: MOBILE_DIGITS }, (_, index) => mobile[index] ?? '');
  const otpCells = Array.from({ length: OTP_DIGITS }, (_, index) => otp[index] ?? '');

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
              <span className="login-eyebrow">
                {step === 'mobile' ? 'ورود دومرحله‌ای امن' : 'تأیید هویت'}
              </span>
              <h1>{step === 'mobile' ? 'به سامانه خوش آمدید' : 'کد تأیید را وارد کنید'}</h1>
              <p>
                {step === 'mobile'
                  ? 'شماره موبایل سازمانی خود را وارد کنید تا کد یکبار مصرف برایتان ارسال شود.'
                  : (
                    <>
                      کد تأیید ارسال‌شده به{' '}
                      <b dir="ltr" className="login-mobile-inline">{toPersianDigits(mobile)}</b>{' '}
                      را وارد کنید.
                    </>
                  )}
              </p>
            </div>

            <form
              id="login-view-credentials"
              onSubmit={step === 'mobile' ? handleRequestCode : handleVerifyCode}
              className="login-form"
            >
              {step === 'mobile' ? (
                <label className="login-field">
                  <span>شماره موبایل سازمانی</span>
                  <span
                    className="login-input-wrap login-mobile-input"
                    dir="ltr"
                    role="group"
                    aria-label="شماره موبایل سازمانی، ۱۱ رقم"
                    onClick={(event) => {
                      // Clicks that land between cells route the caret to the
                      // next empty one; the cells themselves handle their own.
                      if (event.target instanceof HTMLInputElement) return;
                      focusMobileCell(mobile.length);
                    }}
                  >
                    <span className="login-mobile-cells">
                      {/* The fixed local head: two prefilled, non-editable cells. */}
                      {Array.from({ length: MOBILE_PREFIX_LEN }, (_, index) => (
                        <span
                          key={`prefix-${index}`}
                          className="login-mobile-cell is-filled is-fixed"
                          aria-hidden="true"
                        >
                          {toPersianDigits(mobileCells[index])}
                        </span>
                      ))}
                      {/* Nine writable cells, one digit each. */}
                      {mobileCells.slice(MOBILE_PREFIX_LEN).map((digit, position) => {
                        const index = position + MOBILE_PREFIX_LEN;
                        return (
                          <input
                            key={index}
                            ref={(node) => {
                              mobileCellRefs.current[index] = node;
                            }}
                            className={`login-mobile-cell${digit ? ' is-filled' : ''}`}
                            type="text"
                            inputMode="numeric"
                            dir="ltr"
                            value={digit ? toPersianDigits(digit) : ''}
                            onChange={(e) => handleMobileCellChange(index, e.target.value)}
                            onKeyDown={(e) => handleMobileCellKeyDown(index, e)}
                            onPaste={(e) => handleMobileCellPaste(index, e)}
                            onFocus={(e) => e.target.select()}
                            disabled={busy}
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={`شماره موبایل، رقم ${toPersianDigits(index + 1)}`}
                          />
                        );
                      })}
                    </span>
                  </span>
                </label>
              ) : (
                <>
                  <div className="login-mobile-summary">
                    <span><ShieldCheck aria-hidden="true" /> کد به این شماره ارسال شد</span>
                    <b dir="ltr">{toPersianDigits(mobile)}</b>
                  </div>

                  <label className="login-field">
                    <span>کد تأیید ۶ رقمی</span>
                    <span
                      className={`login-input-wrap login-otp-input${verified ? ' is-verified' : ''}${codeInvalid ? ' is-invalid' : ''}`}
                      dir="ltr"
                      role="group"
                      aria-label="کد تأیید، ۶ رقم"
                    >
                      {otpCells.map((digit, index) => (
                        <input
                          key={index}
                          ref={(node) => {
                            otpCellRefs.current[index] = node;
                          }}
                          className={`login-mobile-cell login-otp-cell${digit ? ' is-filled' : ''}${verified ? ' is-verified' : ''}${codeInvalid ? ' is-invalid' : ''}`}
                          type="text"
                          inputMode="numeric"
                          dir="ltr"
                          value={digit ? toPersianDigits(digit) : ''}
                          onChange={(e) => handleOtpCellChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpCellKeyDown(index, e)}
                          onPaste={(e) => handleOtpCellPaste(index, e)}
                          onFocus={(e) => e.target.select()}
                          disabled={busy || verified}
                          autoComplete={index === 0 ? 'one-time-code' : 'off'}
                          spellCheck={false}
                          aria-invalid={codeInvalid}
                          aria-describedby={codeInvalid ? 'login-view-error' : undefined}
                          aria-label={`کد تأیید، رقم ${toPersianDigits(index + 1)}`}
                        />
                      ))}
                    </span>
                  </label>

                  {verified && (
                    <div className="login-verified" role="status" aria-live="polite">
                      <CheckCircle2 aria-hidden="true" />
                      <span>کد تأیید شد — در حال ورود به سامانه…</span>
                    </div>
                  )}

                  {devCode && !verified && (
                    <div className="login-dev-code" role="note">
                      <FlaskConical aria-hidden="true" />
                      <span>
                        پیامک هنوز متصل نیست؛ کد تأیید آزمایشی:
                        <b dir="ltr" className="login-dev-code-value">{toPersianDigits(devCode)}</b>
                      </span>
                    </div>
                  )}

                  {!verified && (
                    <div className="login-otp-actions">
                      <button
                        type="button"
                        className="login-link-button"
                        onClick={handleEditMobile}
                        disabled={busy}
                      >
                        ویرایش شماره
                      </button>
                      {resendIn > 0 ? (
                        <span className="login-resend-hint">
                          ارسال دوباره تا {toPersianDigits(resendIn)} ثانیه
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="login-link-button"
                          onClick={handleResendCode}
                          disabled={busy}
                        >
                          ارسال دوباره کد
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {notice && step === 'code' && !verified && (
                <div className="login-notice" role="status">
                  <ShieldCheck aria-hidden="true" />
                  <span>{notice}</span>
                </div>
              )}

              {error && (
                <div id="login-view-error" className="login-error" role="alert">
                  <AlertTriangle aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || verified}
                className={`login-submit${busy ? ' is-busy' : ''}${verified ? ' is-verified' : ''}`}
                aria-busy={busy}
              >
                <span className="login-submit-label">
                  {verified
                    ? 'کد تأیید شد'
                    : busy
                      ? (step === 'mobile' ? 'در حال ارسال کد...' : 'در حال تأیید...')
                      : (step === 'mobile' ? 'دریافت کد تأیید' : 'تأیید و ورود')}
                </span>
              </button>

              <p className="login-security-note">
                <ShieldCheck aria-hidden="true" />
                {verified
                  ? 'هویت تأیید شد؛ نشست امن شما در حال ایجاد است.'
                  : step === 'mobile'
                    ? 'کد یکبار مصرف کوتاه‌عمر است و نشست شما در کوکی‌های محافظت‌شده نگهداری می‌شود.'
                    : 'این کد یکبار مصرف است و بلافاصله پس از ورود باطل می‌شود.'}
              </p>
            </form>

            <DevSeedLoginPanel onFill={(username) => {
              setMobile(withMobilePrefix(normalizeMobileDigits(username)));
              setStep('mobile');
              setOtp('');
              setVerified(false);
              setCodeInvalid(false);
              setError(null);
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
            <div
              key={activeShowcaseSlide.id}
              className={`showcase-dashboard-slide ${slideDirection > 0 ? 'is-next' : 'is-previous'}`}
              aria-hidden="true"
            >
              {activeSlide === 0 && (
                <>
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
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity=".34" />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0 78 C32 74 39 52 72 60 S112 52 142 43 S176 50 205 31 S251 36 300 8 V98 H0Z" fill="url(#budget-chart-fill)" />
                        <path d="M0 78 C32 74 39 52 72 60 S112 52 142 43 S176 50 205 31 S251 36 300 8" fill="none" stroke="#4f8ef7" strokeWidth="3" />
                        <circle cx="205" cy="31" r="4" fill="#fff" stroke="#4f8ef7" strokeWidth="3" />
                      </svg>
                    </div>
                    <div className="showcase-months"><span>فروردین</span><span>خرداد</span><span>شهریور</span><span>آذر</span></div>
                  </div>

                  <div className="showcase-mini-card">
                    <span className="showcase-mini-icon"><Landmark aria-hidden="true" /></span>
                    <span><small>پروژه‌های فعال</small><strong>۲۴۸ <em>پروژه</em></strong></span>
                    <span className="showcase-mini-badge">+۸.۴٪</span>
                  </div>
                </>
              )}

              {activeSlide === 1 && (
                <div className="showcase-detail-card showcase-security-card">
                  <div className="showcase-detail-heading">
                    <span className="showcase-card-icon"><ShieldCheck aria-hidden="true" /></span>
                    <span><small>مرکز امنیت سامانه</small><strong>نشست محافظت‌شده</strong></span>
                    <span className="showcase-security-status">فعال</span>
                  </div>
                  <div className="showcase-security-seal">
                    <span><KeyRound aria-hidden="true" /></span>
                    <strong>احراز هویت تأیید شد</strong>
                    <small>ارتباط رمزگذاری‌شده و امن</small>
                  </div>
                  <div className="showcase-detail-rows">
                    <div><span>نشست کاربری</span><b>کوکی امن · فقط سرور</b></div>
                    <div><span>وضعیت اتصال</span><b>محافظت‌شده</b></div>
                  </div>
                </div>
              )}

              {activeSlide === 2 && (
                <div className="showcase-detail-card showcase-roles-card">
                  <div className="showcase-detail-heading">
                    <span className="showcase-card-icon"><Network aria-hidden="true" /></span>
                    <span><small>حاکمیت دسترسی</small><strong>مجوزهای سازمانی</strong></span>
                  </div>
                  <div className="showcase-role-table">
                    <div className="showcase-role-row is-header"><span>نقش سازمانی</span><span>مشاهده</span><span>مدیریت</span></div>
                    <div className="showcase-role-row"><span><i /> مدیر سامانه</span><b>کامل</b><b>کامل</b></div>
                    <div className="showcase-role-row"><span><i /> مدیر پروژه</span><b>محدوده من</b><b>پروژه</b></div>
                    <div className="showcase-role-row"><span><i /> حسابرس</span><b>گزارش‌ها</b><b>—</b></div>
                  </div>
                  <div className="showcase-role-foot"><ShieldCheck aria-hidden="true" /> کنترل دسترسی مبتنی بر نقش</div>
                </div>
              )}

              {activeSlide === 3 && (
                <div className="showcase-detail-card showcase-audit-card">
                  <div className="showcase-detail-heading">
                    <span className="showcase-card-icon"><History aria-hidden="true" /></span>
                    <span><small>گزارش نظارتی</small><strong>تاریخچه تغییرات</strong></span>
                    <span className="showcase-audit-count">امروز</span>
                  </div>
                  <div className="showcase-audit-list">
                    <div><i /><span><b>به‌روزرسانی تخصیص بودجه</b><small>کارشناس برنامه‌ریزی · ۱۰:۳۲</small></span></div>
                    <div><i /><span><b>تأیید مرحله اجرای پروژه</b><small>مدیر پروژه · ۰۹:۱۸</small></span></div>
                    <div><i /><span><b>ثبت شاخص‌های منطقه</b><small>کارشناس داده · ۰۸:۴۵</small></span></div>
                  </div>
                  <div className="showcase-audit-foot"><span /> ثبت‌شده با شناسه اپراتور تأییدشده</div>
                </div>
              )}
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
