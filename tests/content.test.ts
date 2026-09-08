import { describe, expect, it } from "vitest";
import { seededTickets, allTickets } from "../src/content/curriculum";
import { validateReference } from "../scripts/content-validation";
import { engineeringTickets } from "../src/content/engineering";
describe("curriculum integrity", () => {
  it("ships 25 complete tickets with unique IDs and concise reviews", () => {
    expect(seededTickets.length).toBe(25);
    expect(new Set(allTickets.map((t) => t.id)).size).toBe(allTickets.length);
    for (const t of seededTickets) {
      expect(t.hints.every(Boolean)).toBe(true);
      expect(t.review.length).toBeGreaterThanOrEqual(2);
      expect(t.review.every((n) => n.text.split(/\s+/).length <= 40)).toBe(
        true,
      );
      expect(Object.keys(t.starterFiles)).toEqual(Object.keys(t.solutionFiles));
    }
  });
  for (const ticket of seededTickets)
    it(`${ticket.id}: its reference satisfies every test`, async () => {
      const result = await validateReference(ticket);
      expect(result.error).toBeUndefined();
      expect(result.results.length).toBe(ticket.testNames!.length);
      expect(result.results.filter((t) => !t.passed)).toEqual([]);
    }, 90000);
  for (const ticket of engineeringTickets)
    it(`${ticket.id}: the buggy starter cannot pass its suite`, async () => {
      const result = await validateReference({
        ...ticket,
        solutionFiles: ticket.starterFiles,
      });
      expect(!!result.error || result.results.some((t) => !t.passed)).toBe(
        true,
      );
    }, 90000);
});
