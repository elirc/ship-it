import { coachingFor } from "../learning";
import { useStore } from "../store";
import type { Ticket } from "../types";

export function LearningNotes({
  ticket,
  before = false,
}: {
  ticket: Ticket;
  before?: boolean;
}) {
  const state = useStore(),
    record = state.learning[ticket.id],
    prompts = coachingFor(ticket);
  if (before)
    return (
      <details className="learning-notes plan-note">
        <summary>Plan before coding</summary>
        <p>{prompts.outcome}</p>
        <label htmlFor={`hypothesis-${ticket.id}`}>Predict one failure</label>
        <p id={`hypothesis-help-${ticket.id}`}>{prompts.predict}</p>
        <textarea
          id={`hypothesis-${ticket.id}`}
          aria-describedby={`hypothesis-help-${ticket.id}`}
          rows={3}
          maxLength={4000}
          placeholder="I expect… because… I can check this by…"
          value={record?.hypothesis ?? ""}
          onChange={(e) =>
            state.saveLearning(ticket.id, "hypothesis", e.target.value)
          }
        />
        <small>
          Then reproduce it, change one thing, and rerun. Notes save
          automatically.
        </small>
      </details>
    );
  return (
    <section className="learning-notes" aria-label="Explain your solution">
      <h3>Explain it before comparing</h3>
      <p>
        Use your own words. These notes are saved for you; their presence is not
        a correctness grade.
      </p>
      {(
        [
          ["explanation", "Explain your approach", prompts.explain],
          ["evidence", "Show test evidence", prompts.evidence],
          ["tradeoff", "Defend a trade-off", prompts.tradeoff],
        ] as const
      ).map(([field, title, prompt]) => (
        <div className="learning-field" key={field}>
          <label htmlFor={`${field}-${ticket.id}`}>{title}</label>
          <p id={`${field}-help-${ticket.id}`}>{prompt}</p>
          <textarea
            id={`${field}-${ticket.id}`}
            aria-describedby={`${field}-help-${ticket.id}`}
            rows={3}
            maxLength={4000}
            value={record?.[field] ?? ""}
            onChange={(e) =>
              state.saveLearning(ticket.id, field, e.target.value)
            }
          />
        </div>
      ))}
      <small>Saved locally. {prompts.transfer}</small>
    </section>
  );
}
