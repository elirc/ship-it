import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  RotateCcw,
  Target,
} from "lucide-react";
import { allTickets, seededTickets } from "../content/curriculum";
import { engineeringTickets } from "../content/engineering";
import {
  careerStages,
  fieldAssignments,
  hasReasoning,
  recallDue,
} from "../learning";
import { accessible, useStore } from "../store";

export function GrowthPlan() {
  const state = useStore();
  const passed = seededTickets.filter(
    (t) => state.progress[t.id].status === "passed",
  );
  const due = passed
    .map((ticket) => ({
      ticket,
      date: recallDue(state.progress[ticket.id], state.learning[ticket.id])!,
    }))
    .filter((x) => x.date <= Date.now())
    .sort((a, b) => a.date - b.date);
  const next = seededTickets.find(
    (t) =>
      state.progress[t.id].status !== "passed" &&
      (accessible(t, state) || t.id === "TF-031"),
  );
  function exportEvidence() {
    const entries = seededTickets
      .filter(
        (t) => state.learning[t.id] || state.progress[t.id].status === "passed",
      )
      .map((t) => {
        const notes = state.learning[t.id];
        return `## ${t.id}: ${t.title}\n\nTests: ${state.progress[t.id].status === "passed" ? "passed" : "not yet passed"}. Spaced recall passes: ${notes?.recalls ?? 0}.\n\n${(["hypothesis", "explanation", "evidence", "tradeoff"] as const).map((k) => `### ${k}\n\n${notes?.[k] || "Not recorded."}`).join("\n\n")}`;
      });
    const fieldwork = fieldAssignments.map(
      (a) =>
        `## ${a.title}\n\n${state.fieldNotes[a.id] || "No evidence recorded."}`,
    );
    const text = `# My engineering learning record\n\nExported ${new Date().toISOString().slice(0, 10)}. Notes and external evidence are self-reported; this is not a certification or a job-level assessment.\n\n${entries.join("\n\n")}\n\n# Transfer to real work\n\n${fieldwork.join("\n\n")}`;
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-engineering-evidence.md";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="page-view growth-view">
      <div className="page-eyebrow">YOUR GROWTH PLAN</div>
      <div className="page-title">
        <div>
          <h1>From following steps to owning outcomes.</h1>
          <p>
            Build the foundations, own a feature, then practice the judgment and
            collaboration behind senior work.
          </p>
        </div>
        <button className="secondary-button" onClick={exportEvidence}>
          <ArrowDownToLine size={15} /> Export evidence
        </button>
      </div>
      <section className="session-card" aria-label="Your next learning session">
        <div>
          <span className="eyebrow">YOUR NEXT SESSION · ABOUT 45 MINUTES</span>
          <h2>
            {due.length
              ? "Start with something you should remember."
              : next
                ? "Work on one small, testable behavior."
                : "Transfer a practiced skill into a real feature."}
          </h2>
          <p>
            5 min: recall. 25 min: build or debug. 10 min: explain and test an
            edge case. 5 min: decide what to revisit. Adjust the pace; there is
            no speed target.
          </p>
        </div>
        {due[0] ? (
          <button
            className="primary-button"
            onClick={() => state.startRecall(due[0].ticket.id)}
          >
            Recall {due[0].ticket.id} <RotateCcw size={15} />
          </button>
        ) : next ? (
          <button
            className="primary-button"
            onClick={() => state.selectTicket(next.id, next.id === "TF-031")}
          >
            Continue {next.id} <ArrowRight size={15} />
          </button>
        ) : (
          <a className="primary-button" href="#transfer-work">
            Choose real-world practice <ArrowRight size={15} />
          </a>
        )}
      </section>
      <div className="growth-metrics">
        <div>
          <strong>{passed.length}</strong>
          <span>Tests passed</span>
          <small>Implementation evidence</small>
        </div>
        <div>
          <strong>
            {passed.filter((t) => hasReasoning(state.learning[t.id])).length}
          </strong>
          <span>Reasoning recorded</span>
          <small>Self-written, not auto-graded</small>
        </div>
        <div>
          <strong>
            {
              passed.filter((t) => (state.learning[t.id]?.recalls ?? 0) > 0)
                .length
            }
          </strong>
          <span>Recalled later</span>
          <small>Fresh code, tests passed when due</small>
        </div>
      </div>
      <section className="growth-section">
        <h2>Your progression</h2>
        <p>
          Use these as evidence targets. A completed checklist or XP total does
          not establish a job level.
        </p>
        <div className="career-stages">
          {careerStages.map((stage, i) => (
            <article key={stage.title}>
              <span className="eyebrow">
                0{i + 1} · {stage.level}
              </span>
              <h3>{stage.title}</h3>
              <p>{stage.proof}</p>
              <small>{stage.task}</small>
              {stage.ids.length > 0 && (
                <div className="concept-tags">
                  {stage.ids.map((id) => (
                    <span key={id}>
                      {state.progress[id].status === "passed" && (
                        <Check size={10} />
                      )}{" "}
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="growth-section">
        <h2>
          Recall queue <span className="muted">{due.length} due</span>
        </h2>
        <p>
          Rebuild from starter code after 1, 3, 7, then 21 days. Early practice
          and assisted runs are useful, but do not advance this schedule. Your
          working draft stays separate.
        </p>
        {passed.length ? (
          <div className="recall-list">
            {passed.map((t) => {
              const record = state.learning[t.id],
                date = recallDue(state.progress[t.id], record),
                isDue = date !== undefined && date <= Date.now();
              return (
                <div className="recall-row" key={t.id}>
                  <div>
                    <strong>
                      {t.id} · {t.title}
                    </strong>
                    <small>
                      {record?.recall?.active
                        ? "Session in progress"
                        : isDue
                          ? "Ready for spaced recall"
                          : `Next recall: ${date ? new Date(date).toLocaleDateString() : "unscheduled"}`}{" "}
                      · {record?.recalls ?? 0} spaced passes
                    </small>
                  </div>
                  <button
                    className={isDue ? "primary-button" : "secondary-button"}
                    onClick={() => state.startRecall(t.id)}
                  >
                    {record?.recall?.active
                      ? "Resume recall"
                      : isDue
                        ? "Recall now"
                        : "Practice early"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="learning-empty">
            <RotateCcw size={20} />
            <p>
              Pass your first ticket to schedule a fresh-code revisit for
              tomorrow.
            </p>
          </div>
        )}
      </section>
      <section className="growth-section">
        <h2>Engineering labs</h2>
        <p>
          Practice bugs and failure modes you encounter while owning a feature.
          Prerequisites are recommendations; open any lab when you feel ready.
        </p>
        <div className="engineering-grid">
          {engineeringTickets.map((t) => {
            const ready = t.prerequisites?.every(
              (id) => state.progress[id].status === "passed",
            );
            return (
              <article key={t.id}>
                <div className="eyebrow">
                  {t.id} ·{" "}
                  {t.difficulty < 3 ? "FOUNDATIONS" : "FEATURE OWNERSHIP"}
                </div>
                <h3>{t.title}</h3>
                <p>{t.userStory}</p>
                <div className="concept-tags">
                  {t.concepts.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <small>
                  {ready
                    ? "Your recommended prerequisites are complete."
                    : `Suggested first: ${t.prerequisites?.join(", ")}`}
                </small>
                <button
                  className="secondary-button"
                  onClick={() => state.selectTicket(t.id)}
                >
                  {state.progress[t.id].status === "passed"
                    ? "Revisit lab"
                    : "Open lab"}{" "}
                  <ArrowRight size={14} />
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="growth-section" id="transfer-work">
        <h2>Transfer to real work</h2>
        <p>
          Senior growth also requires judgment over time and collaboration with
          people. These briefs need a real repository and human feedback. Record
          links or notes; the app does not verify them.
        </p>
        {fieldAssignments.map((a) => (
          <details className="field-assignment" key={a.id}>
            <summary>
              <Target size={17} />
              {a.title}
            </summary>
            <p>{a.brief}</p>
            <p>
              <strong>Evidence to produce:</strong> {a.evidence}
            </p>
            <label htmlFor={`field-${a.id}`}>Your evidence and feedback</label>
            <textarea
              id={`field-${a.id}`}
              rows={5}
              maxLength={8000}
              placeholder="Link to the artifact, explain what you learned, and record the feedback that changed your approach."
              value={state.fieldNotes[a.id] ?? ""}
              onChange={(e) => state.saveFieldNote(a.id, e.target.value)}
            />
            <small>
              Saved locally and included in backup and evidence export.
            </small>
          </details>
        ))}
      </section>
      <div className="note-callout">
        <Target size={20} />
        <p>
          When you get stuck: write the expected behavior, shrink the failing
          example, inspect one value, then change one thing. Ask for a hint or
          feedback after you can explain what you tried.
        </p>
      </div>
      <p className="growth-scope">
        Available now: {seededTickets.length} runnable exercises including six
        engineering labs. {allTickets.filter((t) => t.comingSoon).length}{" "}
        curriculum entries remain upcoming, including the full TypeScript and
        backend tracks.
      </p>
    </div>
  );
}
