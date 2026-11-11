import { describe, it, expect } from "vitest";
import { generateInviteCode } from "./invite-code";

describe("generateInviteCode", () => {
  it("generates an 8-character code with no look-alike characters and ensures codes differ", () => {
    const LOOK_ALIKE_CHARS = ["0", "O", "1", "I", "L", "B", "5", "S", "8"];
    const codes = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();

      // Check length
      expect(code).toHaveLength(8);

      // Check no look-alike characters
      for (const char of LOOK_ALIKE_CHARS) {
        expect(code).not.toContain(char);
      }

      // Check only safe charset characters (A-Z, 2-9 excluding look-alikes)
      expect(code).toMatch(/^[ACDEFGHJKMNPQRTUVWXYZ234679]{8}$/);

      codes.add(code);
    }

    // Verify generated codes are distinct
    expect(codes.size).toBe(50);
  });
});
