/* =========================================================================
   Idempotent data repairs.

   The main seed is version-gated so an operator's own data is never
   overwritten on restart. These repairs add what is *missing* instead of
   rewriting anything; each is a no-op once its work is applied (or if the
   conditions it repairs can no longer occur), so they run at every boot.
   ========================================================================= */

import { and, eq } from 'drizzle-orm';
import { db } from './client.js';
import { priorities } from './schema.js';
import { withDbErrorMapping } from './errors.js';

/**
 * Historical priority titles were shortened; bases upgraded earlier keep
 * the old text. Overwrite only rows whose title equals a recorded
 * previous pair — genuine operator edits are never touched.
 */
export async function refreshPriorityTitlesIfNeeded(): Promise<void> {
  const MIGRATIONS: ReadonlyArray<{ id: string; previous: string; current: string }> = [
    { id: 'p1', previous: 'توسعه زیرساخت‌های عمومی، عمران و خدمات شهری/روستایی', current: 'توسعه و عمران' },
    { id: 'p2', previous: 'اشتغال‌زایی بازدارنده، کارآفرینی و توانمندسازی اقتصادی جوانان', current: 'اشتغال‌زایی و کارآفرینی' },
    { id: 'p3', previous: 'حمایت از آسیب‌پذیران، جوانی جمعیت و فرزندآوری، تسهیل ازدواج و بازپروری بزهکاران', current: 'تسهیل ازدواج و فرزندآوری' },
    { id: 'p4', previous: 'بهداشت، درمان، مقابله با سوءمصرف الکل و مسمومیت متانول، سلامت روان و خودکشی', current: 'بهداشت و درمان' },
    { id: 'p5', previous: 'محیط‌زیست، هوای پاک و کیفیت زندگی', current: 'محیط زیست' },
    { id: 'p6', previous: 'تحکیم بنیان خانواده، پیشگیری از طلاق، مشاوره ازدواج و نشاط اجتماعی', current: 'تحکیم خانواده' },
    { id: 'p7', previous: 'آموزش، توسعه مدارس روستایی و بورسیه دانش‌آموزان مستعد', current: 'آموزش و پرورش' },
    { id: 'p8', previous: 'مشارکت مدنی، نظارت مردمی و شفافیت هزینه‌کرد بودجه', current: 'مشارکت مدنی' },
    { id: 'p9', previous: 'مدیریت بحران، پدافند غیرعامل و ایمنی', current: 'مدیریت بحران' },
    { id: 'p10', previous: 'عدالت محلی، ساماندهی سکونتگاه‌های غیررسمی و بافت‌های حاشیه‌ای', current: 'عدالت محلی' },
    { id: 'p11', previous: 'دانش‌بنیان، نوآوری و فناوری‌های حل مسائل اجتماعی/عمرانی', current: 'دانش‌بنیان' },
  ];

  for (const m of MIGRATIONS) {
    await withDbErrorMapping(async () => {
      await db
        .update(priorities)
        .set({ title: m.current })
        .where(and(eq(priorities.id, m.id), eq(priorities.title, m.previous)));
    });
  }
}

