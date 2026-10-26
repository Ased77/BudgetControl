/* =========================================================================
   Idempotent data repairs.

   The main seed is version-gated so an operator's own data is never
   overwritten on restart. These repairs add what is *missing* instead of
   rewriting anything; each is a no-op once its work is applied (or if the
   conditions it repairs can no longer occur), so they run at every boot.
   ========================================================================= */

import { and, eq, sql } from 'drizzle-orm';
import { db } from './client.js';
import { authUsers, auditLogs, priorities, users } from './schema.js';
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

/**
 * Lost-encoding display names — the "???? ??? ????????" repair.
 *
 * A request body that loses its encoding in transit (a shell client sending
 * the JSON in an ANSI codepage, for example) arrives with every non-ASCII
 * letter already replaced by ASCII "?". Neither PostgreSQL nor this API ever
 * substitutes "?", so a value made only of "?" and separators is
 * unambiguously a transit artifact, never a real name — and once stored it
 * propagates: the account's identity row, its roster mirror (both written by
 * POST /api/auth/users) and every audit row the account later writes carry
 * the skeleton to the UI, which renders it as "؟؟؟؟" in RTL text.
 *
 * The original text cannot be derived from the skeleton, so each repair is a
 * declared exact previous→current pair, applied like the title refresh above:
 * an exact match only, one row each, a no-op the moment it is applied. The
 * pair list stays closed because POST /api/auth/users now rejects "?"-only
 * names at the door.
 */
const LOST_ENCODING_NAME_REPAIRS: ReadonlyArray<{ previous: string; current: string }> = [
  // The deployed operator account «دکتر مسعود عبداللهی» (SYSTEM_ADMIN) was
  // provisioned through an ANSI-mangled body: 4 + 5 + 8 letters → 4 + 5 + 8 "?".
  { previous: '???? ????? ????????', current: 'دکتر مسعود عبداللهی' },
];

export async function repairLostEncodingNamesIfNeeded(): Promise<void> {
  for (const repair of LOST_ENCODING_NAME_REPAIRS) {
    await withDbErrorMapping(async () => {
      const auth = await db
        .update(authUsers)
        .set({ displayName: repair.current })
        .where(eq(authUsers.displayName, repair.previous))
        .returning({ id: authUsers.id });

      const roster = await db
        .update(users)
        .set({ name: repair.current })
        .where(eq(users.name, repair.previous))
        .returning({ id: users.id });

      const audit = await db
        .update(auditLogs)
        .set({ userName: repair.current })
        .where(eq(auditLogs.userName, repair.previous))
        .returning({ id: auditLogs.id });

      // The same skeleton is also quoted inside free-text rationales
      // («خروج <name> از سامانه…»); replace only the exact corrupted substring.
      const rationale = (await db.execute(
        sql`UPDATE audit_logs
               SET rationale = replace(rationale, ${repair.previous}, ${repair.current})
             WHERE rationale LIKE ${`%${repair.previous}%`}
         RETURNING id`,
      )) as { rows: { id: string }[] };

      const touched = auth.length + roster.length + audit.length + rationale.rows.length;
      if (touched > 0) {
        console.log(
          `[db] repaired ${touched} lost-encoding name row(s) ` +
            `(auth: ${auth.length}, roster: ${roster.length}, audit: ${audit.length + rationale.rows.length})`,
        );
      }
    });
  }
}

