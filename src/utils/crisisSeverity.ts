/**
 * Severity ⟷ urgency — the single derivation every crisis consumer shares.
 *
 * `CrisisHarmItem` stores `urgency` beside `severityScore`, and hand-written
 * records let the two drift (a ۲۶٪ severity stamped «بحرانی و فوری», for
 * example). The measure behind both is the same intensity scale, so the
 * urgency label shown on any surface is derived from the score instead of
 * trusting the stored enum. The two upper cut-offs are the shared gauge
 * cut-offs (`utils/gaugeTone`, `HIGHER_IS_WORSE`), so the urgency chip on a
 * card always agrees with the band its severity bar paints:
 *
 *  - ≥ ۷۰ → «بحرانی و فوری» (CRITICAL, rose)
 *  - ۵۰–۶۹ → «شدت بالا» (HIGH, amber)
 *  - ۲۵–۴۹ → «شدت متوسط» (MEDIUM)
 *  - < ۲۵ → «قابل پایش» (LOW)
 *
 * The server reconciles existing rows to this same banding at boot (see
 * `server/db/repairs.ts`), so every other reader — charts, the projects
 * roster, project intake defaults — sees the same wording.
 */
import { GAUGE_GOOD_AT, GAUGE_WARNING_AT } from './gaugeTone';
import type { UrgencyLevel } from '../types';

/** Below this share a crisis is monitored rather than treated urgently. */
export const URGENCY_LOW_AT = 25;

export function urgencyForSeverity(score: number): UrgencyLevel {
  const v = Number.isFinite(score) ? score : 0;
  if (v >= GAUGE_GOOD_AT) return 'CRITICAL';
  if (v >= GAUGE_WARNING_AT) return 'HIGH';
  return v >= URGENCY_LOW_AT ? 'MEDIUM' : 'LOW';
}
