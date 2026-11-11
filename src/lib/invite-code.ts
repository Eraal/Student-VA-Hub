/**
 * Invite code generator.
 *
 * Rules:
 * - 8 characters, uppercase alphanumeric
 * - Excludes look-alike characters: 0 O 1 I L B 5 S 8
 * - Database enforces uniqueness via InviteCode.code @unique
 */

/** Safe charset: no look-alike pairs */
const CHARSET = "ACDEFGHJKMNPQRTUVWXYZ234679";
const CODE_LENGTH = 8;

/**
 * Generate a random invite code.
 * This is a pure function (no DB access) — the caller must check uniqueness
 * in the database and retry if there is a collision (extremely unlikely with
 * 28^8 ≈ 377 billion possible codes).
 */
export function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

