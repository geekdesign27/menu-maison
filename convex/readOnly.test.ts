// @vitest-environment node
// A family whose subscription ended may only read: every public mutation goes
// through requireMemberWriter, which refuses its writes. A new mutation that
// writes another way fails here until it is checked and listed.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Mutations that do not write a family's data through the family writer, on purpose
const ALLOWED = new Set([
  "access.logout", // ends this phone's session
  "account.signOutOthers", // ends the member's other sessions
  "account.confirmEmail", // the link's own profile, no session: confirms an address
  "account.requestReset", // public form: e-mails a link, writes no family data
  "superadmin.createOne", // the super-admin space checks requireSuperadmin
  "superadmin.adminLink",
  "superadmin.setSuspended",
  "superadmin.setAiCaps",
  "superadmin.setOffered",
]);

function publicMutations() {
  const dir = join(__dirname);
  const found: { name: string; body: string }[] = [];
  for (const file of readdirSync(dir).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
  )) {
    const source = readFileSync(join(dir, file), "utf8");
    const module = file.replace(/\.ts$/, "");
    for (const m of source.matchAll(/export const (\w+) = mutation\(\{/g)) {
      const start = m.index! + m[0].length;
      const next = source.slice(start).search(/\nexport /);
      found.push({
        name: `${module}.${m[1]}`,
        body: source.slice(start, next < 0 ? undefined : start + next),
      });
    }
  }
  return found;
}

describe("read-only families", () => {
  it("finds the public mutations", () => {
    expect(publicMutations().length).toBeGreaterThan(40);
  });

  it("every public mutation checks the family's access, or is listed here", () => {
    const unchecked = publicMutations()
      .filter(
        (m) => !m.body.includes("requireMemberWriter(") && !ALLOWED.has(m.name),
      )
      .map((m) => m.name);
    expect(unchecked).toEqual([]);
  });

  it("the exceptions that skip the read-only check are the account's own settings", () => {
    const skipping = publicMutations()
      .filter((m) => m.body.includes("evenReadOnly: true"))
      .map((m) => m.name)
      .sort();
    expect(skipping).toEqual([
      "access.resetLink",
      "access.setLang",
      "access.setRole",
      "access.setUsername",
      "account.removeEmail",
      "onboarding.finish",
    ]);
  });
});
