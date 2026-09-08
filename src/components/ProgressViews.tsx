import {
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Flame,
  GitBranch,
  Layers3,
  LockKeyhole,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import {
  allTickets,
  isBoss,
  seededTickets,
  sprints,
} from "../content/curriculum";
import { accessible, badgeDefinitions, useStore } from "../store";
import type { Ticket } from "../types";
import { engineeringTickets } from "../content/engineering";
export function Board() {
  const state = useStore(),
    sprint = sprints.find((s) => s.id === state.selectedSprint) ?? sprints[0],
    tickets = [...sprint.tickets, sprint.boss];
  const firstReact =
    sprint.id === "s4" && state.progress["TF-031"].status === "locked";
  function card(ticket: Ticket) {
    const p = state.progress[ticket.id],
      canOpen = accessible(ticket, state);
    return (
      <button
        key={ticket.id}
        className={`board-card ${isBoss(ticket) ? "boss-card" : ""}`}
        disabled={!canOpen}
        onClick={() => state.selectTicket(ticket.id)}
      >
        <div>
          <span className="ticket-id">{ticket.id}</span>
          {isBoss(ticket) ? (
            <Trophy size={16} />
          ) : p.status === "passed" ? (
            <Check size={16} />
          ) : ticket.comingSoon ? (
            <span className="soon-tag">Coming soon</span>
          ) : p.status === "locked" ? (
            <LockKeyhole size={13} />
          ) : (
            <span className="live-dot" />
          )}
        </div>
        <h3>{ticket.title}</h3>
        <p>{ticket.userStory}</p>
        <div className="concept-tags">
          {ticket.concepts.slice(0, 3).map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
        <footer>
          <span>
            <Zap size={12} />
            {ticket.xp} XP
          </span>
          <span>
            {p.status === "passed"
              ? `${p.hintsUsed} hints · ${p.attempts} attempts`
              : isBoss(ticket)
                ? "Boss challenge"
                : `Level ${ticket.difficulty}`}
          </span>
          {canOpen && <ArrowRight size={14} />}
        </footer>
      </button>
    );
  }
  return (
    <div className="page-view">
      <div className="page-eyebrow">
        THE BUILD PLAN <span>/</span> SPRINT {sprint.id.slice(1)}
      </div>
      <div className="page-title">
        <div>
          <h1>{sprint.title}</h1>
          <p>{sprint.goal}</p>
        </div>
        <span className="page-count">
          <strong>
            {
              tickets.filter((t) => state.progress[t.id].status === "passed")
                .length
            }
          </strong>{" "}
          / {tickets.length} shipped
        </span>
      </div>
      <div className="sprint-selector">
        {sprints.map((s, i) => (
          <button
            className={s.id === sprint.id ? "active" : ""}
            key={s.id}
            onClick={() => state.selectSprint(s.id)}
          >
            <span>0{i + 1}</span>
            {s.title}
          </button>
        ))}
      </div>
      {firstReact && (
        <div className="preview-banner">
          <Sparkles size={22} />
          <div>
            <strong>Take React for a spin.</strong>
            <p>
              Try four complete React tickets in the preview lab. The full
              sprint still unlocks after Sprint 3.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => state.selectTicket("TF-031", true)}
          >
            Open React lab <ArrowRight size={15} />
          </button>
        </div>
      )}
      {sprint.id !== "s1" &&
        state.progress[sprints[sprints.indexOf(sprint) - 1].boss.id].status !==
          "passed" && (
          <div className="board-notice">
            <LockKeyhole size={14} /> Pass the previous sprint’s boss to unlock
            this sprint. Coming-soon content is part of the roadmap.
          </div>
        )}
      <div className="kanban">
        {(["open", "locked", "passed"] as const).map((status) => {
          const list = tickets.filter(
            (t) => state.progress[t.id].status === status,
          );
          return (
            <section key={status}>
              <div className={`kanban-heading ${status}`}>
                <span>
                  {status === "open" ? (
                    <span className="live-dot" />
                  ) : status === "locked" ? (
                    <LockKeyhole size={13} />
                  ) : (
                    <Check size={14} />
                  )}
                  {
                    {
                      open: "Ready to build",
                      locked: "Up next",
                      passed: "Shipped",
                    }[status]
                  }
                </span>
                <span>{list.length}</span>
              </div>
              <div className="kanban-cards">
                {list.map(card)}
                {!list.length && (
                  <div className="kanban-empty">
                    {status === "passed" ? (
                      <Rocket size={25} />
                    ) : (
                      <Layers3 size={25} />
                    )}
                    <strong>
                      {status === "passed"
                        ? "Your first ship starts here."
                        : status === "open"
                          ? "All caught up."
                          : "Nothing waiting in the wings."}
                    </strong>
                    <p>
                      {status === "passed"
                        ? "Every green test brings you closer."
                        : status === "open"
                          ? "Finish the previous boss to open new work."
                          : "Keep building the next piece."}
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
export function Skills() {
  const state = useStore();
  const concepts = [...new Set(allTickets.flatMap((t) => t.concepts))];
  const mastered = concepts.filter((c) =>
    allTickets.some(
      (t) => t.concepts.includes(c) && state.progress[t.id].status === "passed",
    ),
  );
  return (
    <div className="page-view">
      <div className="page-eyebrow">YOUR DEVELOPER TOOLKIT</div>
      <div className="page-title">
        <div>
          <h1>Skills, earned in the code.</h1>
          <p>Every concept connects to something you actually built.</p>
        </div>
        <div className="page-count">
          <strong>{mastered.length}</strong> / {concepts.length} explored
        </div>
      </div>
      <div className="stats-grid">
        <div>
          <Code2 />
          <span>Concepts put to work</span>
          <strong>{mastered.length}</strong>
          <small>From passing implementations</small>
        </div>
        <div>
          <GitBranch />
          <span>Tickets shipped</span>
          <strong>
            {
              Object.values(state.progress).filter((p) => p.status === "passed")
                .length
            }
          </strong>
          <small>{seededTickets.length} playable tickets available</small>
        </div>
        <div>
          <Flame />
          <span>Build streak</span>
          <strong>
            {state.streak}
            <em> days</em>
          </strong>
          <small>
            {state.freezeUsed ? "Grace day used" : "One grace day available"}
          </small>
        </div>
      </div>
      <div className="skills-legend">
        <span>
          <i className="mastered" />
          Practiced in passing code
        </span>
        <span>
          <i className="available" />
          Available to practice
        </span>
        <span>
          <i />
          On the roadmap
        </span>
      </div>
      <div className="skills-map">
        {[
          ...sprints.map((s) => ({
            id: s.id,
            title: s.title,
            tickets: [...s.tickets, s.boss],
          })),
          {
            id: "engineering",
            title: "Engineering judgment",
            tickets: engineeringTickets,
          },
        ].map((s, i) => {
          const tickets = s.tickets,
            items = [...new Set(tickets.flatMap((t) => t.concepts))];
          return (
            <section key={s.id}>
              <div>
                <span className="sprint-num">0{i + 1}</span>
                <h2>{s.title}</h2>
                <span>
                  {
                    items.filter((c) =>
                      tickets.some(
                        (t) =>
                          t.concepts.includes(c) &&
                          state.progress[t.id].status === "passed",
                      ),
                    ).length
                  }{" "}
                  / {items.length}
                </span>
              </div>
              <div className="skill-tiles">
                {items.map((c) => {
                  const passed = tickets.filter(
                      (t) =>
                        t.concepts.includes(c) &&
                        state.progress[t.id].status === "passed",
                    ).length,
                    playable = tickets.some(
                      (t) => t.concepts.includes(c) && !t.comingSoon,
                    );
                  return (
                    <button
                      className={
                        passed ? "mastered" : playable ? "available" : ""
                      }
                      key={c}
                      title={`${passed} passing ticket${passed === 1 ? "" : "s"} use ${c}`}
                      onClick={() =>
                        s.id === "engineering"
                          ? state.setView("growth")
                          : state.selectSprint(s.id)
                      }
                    >
                      {passed ? (
                        <Check size={13} />
                      ) : (
                        <span className="skill-square" />
                      )}
                      {c}
                      <span>{passed || "·"}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <div className="note-callout">
        <Sparkles size={18} />
        <p>
          A green tile means you’ve used the concept in passing code. Revisit
          and refactor tickets to turn practice into fluency.
        </p>
      </div>
    </div>
  );
}
const badgeIcons = [
  GitBranch,
  Target,
  ShieldCheck,
  Code2,
  Layers3,
  Timer,
  Rocket,
];
export function Achievements() {
  const state = useStore();
  return (
    <div className="page-view">
      <div className="page-eyebrow">GOOD HABITS. REAL PROGRESS.</div>
      <div className="page-title">
        <div>
          <h1>More than a green check.</h1>
          <p>Recognition for the habits that make a better engineer.</p>
        </div>
        <div className="page-count">
          <strong>{state.badges.length}</strong> / {badgeDefinitions.length}{" "}
          earned
        </div>
      </div>
      <div className="achievement-grid">
        {badgeDefinitions.map((badge, i) => {
          const Icon = badgeIcons[i],
            earned = state.badges.includes(badge.id);
          return (
            <article
              className={`achievement-card ${earned ? "earned" : ""}`}
              key={badge.id}
            >
              <div className="badge-emblem">
                <Icon size={30} strokeWidth={1.5} />
              </div>
              <span className="achievement-status">
                {earned ? (
                  <>
                    <Check size={12} /> EARNED
                  </>
                ) : (
                  <>
                    <LockKeyhole size={11} /> NOT YET
                  </>
                )}
              </span>
              <h2>{badge.name}</h2>
              <p>{badge.description}</p>
            </article>
          );
        })}
      </div>
      <button
        className="text-button"
        onClick={() => state.setView("workspace")}
      >
        Back to building <ChevronRight size={15} />
      </button>
    </div>
  );
}
