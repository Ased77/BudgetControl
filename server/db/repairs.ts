/* =========================================================================
   Idempotent data repairs.

   The main seed is version-gated so an operator's own data is never
   overwritten on restart. These repairs add what is *missing* instead of
   rewriting anything; each is a no-op once its work is applied (or if the
   conditions it repairs can no longer occur), so they run at every boot.
   ========================================================================= */

import { and, eq, isNull } from 'drizzle-orm';
import { db } from './client.js';
import { priorities, projects, rolesPermissions, users } from './schema.js';
import { withDbErrorMapping } from './errors.js';
import { INITIAL_USERS, INITIAL_ROLES_PERMISSIONS, INITIAL_PROJECTS } from '../../src/data/initialData.js';

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
 * Incremental seed for the «رئیس اداره» role and the three things a
 * database created before it existed could be missing:
 *   1. the `canCreateProject` flag on roles stored before it existed
 *      (their behaviour allowed project creation, so it defaults on);
 *   2. the role row and its demo user, when absent;
 *   3. the creator stamp on the demo projects that belong to that user,
 *      so the role's own-records scope shows something on existing bases.
 *
 * Nothing is overwritten: an existing role/user keeps operator state, a
 * project that already names a creator keeps its stamp.
 */
export async function ensureOfficeHeadRoleIfNeeded(): Promise<void> {
  const role = INITIAL_ROLES_PERMISSIONS.find((r) => r.role === 'OFFICE_HEAD');
  const demoUser = INITIAL_USERS.find((u) => u.role === 'OFFICE_HEAD');

  await withDbErrorMapping(async () => {
    await db.transaction(async (tx) => {
      // (1) backfill the flag on stored roles
      const roles = await tx.select().from(rolesPermissions);
      for (const stored of roles) {
        if (stored.canCreateProject) continue;
        // Roles are defaulted to false at column level; only ones the base
        // allowed to create projects get the flag, which is every role that
        // predates the flag and could ADD projects (mirrors legacy UX).
        await tx
          .update(rolesPermissions)
          .set({ canCreateProject: true })
          .where(eq(rolesPermissions.role, stored.role));
      }

      // (2) the role row and its demo user, when missing
      if (role) {
        const existsRole = await tx
          .select({ role: rolesPermissions.role })
          .from(rolesPermissions)
          .where(eq(rolesPermissions.role, role.role))
          .limit(1);
        if (existsRole.length === 0) {
          await tx
            .insert(rolesPermissions)
            .values({
              role: role.role,
              roleTitleFa: role.roleTitleFa,
              description: role.description,
              canCreateProject: true,
              scopeLevel: role.scopeLevel,
            });
          console.log('[db] Added role OFFICE_HEAD');
        }
      }

      if (demoUser) {
        const existsUser = await tx.select({ id: users.id }).from(users).where(eq(users.id, demoUser.id)).limit(1);
        if (existsUser.length === 0) {
          await tx
            .insert(users)
            .values({
              id: demoUser.id,
              name: demoUser.name,
              role: demoUser.role,
              roleFa: demoUser.roleFa,
              roleTitleFa: demoUser.roleTitleFa,
              avatar: demoUser.avatar,
              organization: demoUser.organization,
              departmentId: demoUser.departmentId ?? null,
              allowedLocationId: demoUser.allowedLocationId ?? null,
              province: demoUser.province ?? null,
              county: demoUser.county ?? null,
            });
          console.log('[db] Added demo user', demoUser.id);
        }

        // (3) creator stamps on the demo projects
        for (const seededProject of INITIAL_PROJECTS) {
          if (seededProject.createdByUserId !== demoUser.id) continue;
          await tx
            .update(projects)
            .set({ createdByUserId: demoUser.id })
            .where(and(eq(projects.id, seededProject.id), isNull(projects.createdByUserId)));
        }
      }
    });
  });
}
