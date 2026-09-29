import { ProjectStatus } from '../types';

/**
 * Persian label and pill colour for each project status. Shared by the
 * drill-down modals of the entities that carry projects (ادارات، مجریان و
 * پیمانکاران) so a status reads the same everywhere it is listed.
 */
export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  PROPOSED: {
    label: 'پیشنهادی',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  APPROVED: {
    label: 'مصوب',
    className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  },
  IN_PROGRESS: {
    label: 'در حال اجرا',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  },
  COMPLETED: {
    label: 'تکمیل‌شده',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  SUSPENDED: {
    label: 'متوقف',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  },
};
