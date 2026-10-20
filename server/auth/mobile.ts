/* =========================================================================
   Mobile-number identity normalizer.

   The login identity in this system is the MOBILE NUMBER (replacing the
   email identity of the pre-launch phase). Every entry point — login,
   admin issuance, bootstrap, seed scripts — funnels raw user input through
   normalizeMobile() so exactly one canonical form reaches the database:

     11 ASCII digits, starting with 09   e.g. 09131234567

   Accepted spellings (digits may be Persian ۰-۹ / Arabic-Indic ٠-٩):
     0912…  912…  +98 912…  98 912…  0098 912…  (+ spaces/dashes anywhere)
   ========================================================================= */

/** Persian (U+06F0–U+06F9) and Arabic-Indic (U+0660–U+0669) digit ranges. */
const EASTERN_DIGIT_SPANS: Array<[string, string]> = [
  ['\u06F0', '\u06F9'],
  ['\u0660', '\u0669'],
];

function easternToAscii(raw: string): string {
  return raw.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (char) => {
    for (const [lo, hi] of EASTERN_DIGIT_SPANS) {
      if (char >= lo && char <= hi) {
        const d = char.charCodeAt(0) - lo.charCodeAt(0);
        return String(d);
      }
    }
    return char;
  });
}

/**
 * Canonicalize a mobile number; null when the input cannot possibly be a
 * valid Iranian mobile number. Trimmed output — safe at rest, safe as a
 * unique key, safe to hand to the login lookup.
 */
export function normalizeMobile(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let candidate = easternToAscii(raw).replace(/[\s\-()\u200c]/g, '');
  if (!candidate) return null;

  if (candidate.startsWith('+98')) candidate = `0${candidate.slice(3)}`;
  else if (candidate.startsWith('0098')) candidate = `0${candidate.slice(4)}`;
  else if (candidate.startsWith('98') && candidate.length === 12) candidate = `0${candidate.slice(2)}`;
  else if (candidate.startsWith('9') && candidate.length === 10) candidate = `0${candidate}`;

  return /^09\d{9}$/.test(candidate) ? candidate : null;
}

/** True after normalization produces the canonical form. */
export function isNormalizedMobile(candidate: unknown): boolean {
  return typeof candidate === 'string' && /^09\d{9}$/.test(candidate);
}
