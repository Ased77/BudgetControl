import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HelpCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toPersianDigits } from '../utils/numberUtils';

/**
 * راهنمای سامانه — the first-run guided tour.
 *
 * A spotlight overlay that walks a new operator through the sections of the
 * workspace. Each step names an element on the page (by its id) and, when it
 * belongs to another section, the tab that must be active first — so the tour
 * genuinely moves across the app instead of describing it from one screen: the
 * page behind the card changes as the user advances.
 *
 * The step card is anchored to the target element and flips above it when
 * there is no room below, so it works for both the session strip at the top of
 * the workspace and the page headers further down the scroll container.
 *
 * Seen-once, relaunchable: the shell records that the tour has been shown (see
 * `utils/systemTour.ts`) so a new user sees it a single time on first sign-in,
 * while the «راهنمای سامانه» button in the identity bar reopens it on demand.
 *
 * The component owns no storage of its own: `onClose` is told whether the user
 * reached the end, and the shell decides what that means — retry hint included.
 */

interface SystemTourStep {
  /** id of the element to spotlight; steps without a visible target fall back to a centred card. */
  targetId: string;
  /** Short kicker above the title (the section the step belongs to). */
  eyebrow: string;
  title: string;
  body: string;
  /** Tab activated before the step is shown — this is what moves the tour across sections. */
  tab?: string;
}

/**
 * The tour, in order. The first three steps describe the session strip and the
 * navigation rail — the furniture every page shares — and the rest visit one
 * representative page per section, so the user ends the tour having seen the
 * whole map.
 */
const SYSTEM_TOUR_STEPS: SystemTourStep[] = [
  {
    targetId: 'app-workspace-identity-bar',
    eyebrow: 'خوش آمدید',
    title: 'به سامانه توسعه ملی خوش آمدید',
    body: 'این نوار، هویت نشست شماست: محدوده جغرافیایی فعال و کاربری که وارد شده است. هر صفحه‌ای که باز می‌کنید بر پایه همین دو مورد فیلتر می‌شود.',
  },
  {
    targetId: 'app-workspace-identity-bar-scope',
    eyebrow: 'محدوده فعال',
    title: 'انتخاب محدوده جغرافیایی',
    body: 'با کلیک روی این بخش، استان و شهرستان فعال سامانه را انتخاب می‌کنید. همه داده‌ها، پروژه‌ها و تحلیل‌ها به همان محدوده محدود می‌شوند.',
  },
  {
    targetId: 'app-sleek-right-navigation-sidebar',
    eyebrow: 'ناوبری',
    title: 'بخش‌های سامانه',
    body: 'همه بخش‌ها در این منو دسته‌بندی شده‌اند: پایش و داده‌های پایه، سازمان‌ها و مجریان، منابع و اولویت‌ها، چرخه پروژه و تحلیل و حاکمیت. با انتخاب هر مورد، همان صفحه باز می‌شود.',
  },
  {
    targetId: 'national-dashboard-view-page-header',
    eyebrow: 'بخش ۱',
    title: 'داشبورد ملی',
    body: 'تصویر کلی سامانه در یک نگاه: شاخص‌های کلیدی، وضعیت تخصیص بودجه و هشدارهای هوشمند در همین صفحه خلاصه شده است.',
    tab: 'DASHBOARD',
  },
  {
    targetId: 'population-view-page-header',
    eyebrow: 'بخش ۲',
    title: 'پایش و داده‌های پایه',
    body: 'بخش پایش، جمعیت و شاخص‌های مکانی هر شهرستان را نگه می‌دارد؛ داده‌هایی که موتور تحلیل برای اولویت‌بندی از آن‌ها استفاده می‌کند.',
    tab: 'POPULATION',
  },
  {
    targetId: 'departments-view-page-header',
    eyebrow: 'بخش ۳',
    title: 'سازمان‌ها و مجریان',
    body: 'ادارات، دستگاه‌های مجری و پیمانکاران در این بخش ثبت و مدیریت می‌شوند تا بدانید هر اقدام را چه کسی اجرا می‌کند.',
    tab: 'DEPARTMENTS',
  },
  {
    targetId: 'budget-sources-view-page-header',
    eyebrow: 'بخش ۴',
    title: 'منابع و اولویت‌ها',
    body: 'منابع بودجه، اولویت‌های توسعه و بحران‌های محلی اینجا تعریف می‌شوند و پایه محاسبه درصد تخصیص بین بخش‌ها هستند.',
    tab: 'BUDGET_SOURCES',
  },
  {
    targetId: 'create-project-view-page-header',
    eyebrow: 'بخش ۵',
    title: 'چرخه پروژه',
    body: 'از ثبت پروژه جدید تا پیگیری پروژه‌های در جریان: این بخش کل عمر پروژه را از تعریف تا پیشرفت پوشش می‌دهد.',
    tab: 'CREATE_PROJECT',
  },
  {
    targetId: 'charts-view-page-header',
    eyebrow: 'بخش ۶',
    title: 'تحلیل و حاکمیت',
    body: 'نمودارها و ابزارهای تحلیلی، مقایسه شاخص‌ها و روند تخصیص بودجه را به شکل بصری نشان می‌دهند.',
    tab: 'CHARTS',
  },
  {
    targetId: 'roles-and-access-view-page-header',
    eyebrow: 'بخش ۷',
    title: 'نقش‌ها و سطوح دسترسی',
    body: 'در پایان، از این بخش نقش‌ها و سطح دسترسی کاربران را مدیریت می‌کنید. همین صفحه با کلیک روی نشان کاربر در نوار بالا هم باز می‌شود. این پایان راهنماست؛ هر وقت لازم شد می‌توانید آن را از دکمه «راهنمای سامانه» دوباره اجرا کنید.',
    tab: 'ROLES_PERMISSIONS',
  },
];

interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Breathing room between the spotlight edge and the element it frames. */
const SPOTLIGHT_PAD = 8;
/** Gap between the framed element and the step card. */
const CARD_GAP = 16;
/** Never let the card touch the viewport edge. */
const VIEWPORT_MARGIN = 16;
const CARD_WIDTH = 384;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface SystemTourProps {
  open: boolean;
  /**
   * Left the tour. `finished` is true when it was closed on the last step and
   * false when it was dismissed early — the shell uses the difference to decide
   * whether to nudge the user about the button.
   */
  onClose: (finished: boolean) => void;
}

export const SystemTour: React.FC<SystemTourProps> = ({ open, onClose }) => {
  const { setActiveTab } = useAppContext();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TourRect | null>(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0, width: CARD_WIDTH });
  const [viewportTick, setViewportTick] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // The context hands out a fresh `setActiveTab` on every provider render; a ref
  // keeps the measuring effect below keyed on the step alone, so switching a tab
  // from inside the tour cannot re-trigger it.
  const setActiveTabRef = useRef(setActiveTab);
  setActiveTabRef.current = setActiveTab;

  const total = SYSTEM_TOUR_STEPS.length;
  const step = SYSTEM_TOUR_STEPS[index];
  const isLast = index === total - 1;

  const close = useCallback(() => onClose(index >= total - 1), [index, total, onClose]);

  const goTo = useCallback(
    (next: number) => setIndex((current) => clamp(next, 0, total - 1)),
    [total]
  );

  const next = useCallback(() => {
    if (index >= total - 1) close();
    else setIndex(index + 1);
  }, [close, index, total]);

  const prev = useCallback(() => setIndex((current) => Math.max(0, current - 1)), []);

  // Reopening always starts at the first step.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Follow the target: activate its section, bring it into view, then keep the
  // spotlight glued to it as the page scrolls or its layout settles.
  useEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }
    const current = SYSTEM_TOUR_STEPS[index];
    if (current.tab) setActiveTabRef.current(current.tab);

    let cancelled = false;
    let frame = 0;
    let target: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    const started = performance.now();

    const update = () => {
      if (cancelled || !target) return;
      const r = target.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const attach = (el: HTMLElement) => {
      target = el;
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      update();
      observer = new ResizeObserver(update);
      observer.observe(el);
      window.addEventListener('scroll', update, true);
      window.addEventListener('resize', update);
    };

    // A step that switches tabs mounts its page a frame or two later, so poll
    // briefly for the target instead of measuring once and missing it.
    const poll = () => {
      if (cancelled) return;
      const el = document.getElementById(current.targetId);
      if (el) {
        const r = el.getBoundingClientRect();
        // A target parked off to one side — the mobile nav drawer while it is
        // closed — counts as absent, so the step centres its card instead of
        // framing a sliver at the viewport edge. A target that is merely
        // scrolled out of view is still valid: `attach` brings it back.
        const offCanvas = r.left >= window.innerWidth || r.right <= 0;
        if (offCanvas) {
          setRect(null);
          return;
        }
        if (r.width > 0 && r.height > 0) {
          attach(el);
          return;
        }
      }
      if (performance.now() - started < 1500) {
        frame = requestAnimationFrame(poll);
      } else {
        setRect(null); // no visible target — the card centres itself
      }
    };
    frame = requestAnimationFrame(poll);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, index]);

  // Re-place the card when the viewport changes size.
  useEffect(() => {
    if (!open) return;
    const onResize = () => setViewportTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  // Anchor the card to the spotlight: below the target when it fits, above it
  // otherwise, and always inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(CARD_WIDTH, vw - VIEWPORT_MARGIN * 2);
    const height = cardRef.current?.offsetHeight ?? 240;
    let top: number;
    let left: number;

    if (rect && rect.width > 0) {
      const below = rect.top + rect.height + SPOTLIGHT_PAD + CARD_GAP;
      const above = rect.top - SPOTLIGHT_PAD - CARD_GAP - height;
      top = below + height <= vh - VIEWPORT_MARGIN ? below : Math.max(VIEWPORT_MARGIN, above);
      left = clamp(rect.left + rect.width / 2 - width / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN));
    } else {
      top = clamp(vh / 2 - height / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vh - height - VIEWPORT_MARGIN));
      left = clamp(vw / 2 - width / 2, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN));
    }
    setCardPos({ top, left, width });
  }, [open, rect, index, viewportTick]);

  // Keyboard: Escape leaves, and in this RTL app the left arrow is forward.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') next();
      else if (event.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close, next, prev]);

  // Move focus into the card so the keyboard drives the tour.
  useEffect(() => {
    if (open) nextRef.current?.focus();
  }, [open, index]);

  if (!open) return null;

  const spotlight = rect && rect.width > 0 ? rect : null;

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="راهنمای سامانه"
      className="fixed inset-0 z-[100] overflow-hidden"
    >
      {spotlight ? (
        // One shadow paints the whole dim layer and leaves a hole over the target.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-2xl ring-2 ring-blue-400/90 transition-all duration-200 ease-out"
          style={{
            top: spotlight.top - SPOTLIGHT_PAD,
            left: spotlight.left - SPOTLIGHT_PAD,
            width: spotlight.width + SPOTLIGHT_PAD * 2,
            height: spotlight.height + SPOTLIGHT_PAD * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)',
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-slate-900/60" />
      )}

      <div
        ref={cardRef}
        style={{ top: cardPos.top, left: cardPos.left, width: cardPos.width }}
        className="absolute rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/25 transition-[top,left] duration-200 ease-out"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-blue-600">{step.eyebrow}</p>
            <h2 className="text-sm font-black leading-snug text-slate-900">{step.title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="بستن راهنمای سامانه"
            title="بستن راهنما"
            className="-m-1 shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-slate-400">
            مرحله {toPersianDigits(index + 1)} از {toPersianDigits(total)}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              رد کردن
            </button>
            {index > 0 && (
              <button
                type="button"
                onClick={prev}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                قبلی
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-500/30 transition-colors hover:bg-blue-700"
            >
              {isLast ? 'پایان راهنما' : 'بعدی'}
              {!isLast && <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {SYSTEM_TOUR_STEPS.map((s, i) => (
            <button
              key={s.targetId}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`رفتن به مرحله ${toPersianDigits(i + 1)}`}
              aria-current={i === index ? 'step' : undefined}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === index ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemTour;
