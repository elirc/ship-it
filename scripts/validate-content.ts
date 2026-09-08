import { seededTickets, allTickets } from "../src/content/curriculum";
import { validateReference } from "./content-validation";
let failed = 0,
  checks = 0;
if (new Set(allTickets.map((t) => t.id)).size !== allTickets.length)
  throw new Error("Duplicate ticket IDs");
for (const ticket of seededTickets) {
  if (
    ticket.hints.some((h) => !h.trim()) ||
    ticket.review.length < 2 ||
    ticket.review.some((n) => n.text.split(/\s+/).length > 40) ||
    !ticket.concepts.length
  )
    throw new Error(`${ticket.id}: missing or invalid curriculum metadata`);
  const result = await validateReference(ticket);
  checks += result.results.length;
  if (
    result.error ||
    !result.results.length ||
    result.results.some((t) => !t.passed) ||
    result.results.length !== ticket.testNames?.length
  ) {
    failed++;
    console.error(
      `FAIL ${ticket.id} ${ticket.title}`,
      result.error ?? result.results.filter((t) => !t.passed),
    );
  } else
    console.log(
      `PASS ${ticket.id} · ${result.results.length} tests · ${ticket.title}`,
    );
}
console.log(
  `\n${seededTickets.length - failed}/${seededTickets.length} reference solutions passed (${checks} assertions groups).`,
);
if (failed) process.exitCode = 1;
