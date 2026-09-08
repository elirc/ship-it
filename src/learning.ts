import type { LearningRecord, Progress, RunResult, Ticket } from "./types";

export const emptyLearning = (): LearningRecord => ({
  hypothesis: "",
  explanation: "",
  evidence: "",
  tradeoff: "",
  recalls: 0,
});
export const recallIntervals = [1, 3, 7, 21];
export function recallDue(progress: Progress, learning?: LearningRecord) {
  if (progress.status !== "passed" || !progress.passedAt) return undefined;
  const anchor = learning?.lastRecallAt ?? progress.passedAt;
  const date = new Date(anchor);
  if (!Number.isFinite(date.getTime())) return undefined;
  date.setDate(
    date.getDate() + recallIntervals[Math.min(learning?.recalls ?? 0, 3)],
  );
  return date.getTime();
}
export function suitePassed(ticket: Ticket, result: RunResult) {
  const known = new Set(ticket.testNames ?? []);
  return (
    !ticket.comingSoon &&
    known.size > 0 &&
    !result.error &&
    result.results.length === known.size &&
    result.results.every((t) => t.passed && known.has(t.name)) &&
    new Set(result.results.map((t) => t.name)).size === known.size
  );
}
export function hasReasoning(record?: LearningRecord) {
  return (
    !!record &&
    [record.explanation, record.evidence, record.tradeoff].every(
      (v) => v.trim().length > 0,
    )
  );
}
type Coaching = {
  outcome: string;
  predict: string;
  explain: string;
  evidence: string;
  tradeoff: string;
  transfer: string;
};
const prompts: Record<string, [string, string, string]> = {
  "TF-001": [
    "Which input reaches trim() before it is safe?",
    "Why validate at the function boundary?",
    "Should duplicate IDs be rejected here or by a repository?",
  ],
  "TF-002": [
    "Which caller still holds a reference to the original task?",
    "Explain shallow copying using a nested object example.",
    "When would a shallow copy be insufficient?",
  ],
  "TF-003": [
    "How should an unknown filter differ from a valid empty result?",
    "Why must all return a fresh array too?",
    "Compare rejecting unknown filters with silently defaulting.",
  ],
  "TF-004": [
    "What happens when one or both dates are invalid?",
    "Trace a tie and an invalid date through your comparator.",
    "Would you parse dates repeatedly or normalize them once for a large list?",
  ],
  "TF-005": [
    "What happens if a project is named __proto__?",
    "Why is changing a fresh accumulator safe here?",
    "Compare a null-prototype object with Map for user-defined keys.",
  ],
  "TF-006": [
    "What should an empty or whitespace query match?",
    "Where do you normalize the query and why?",
    "How would search change for accents and other languages?",
  ],
  "TF-007": [
    "What value makes sense for a completion rate with no tasks?",
    "Trace the calculation for an empty list.",
    "Would you store derived statistics or calculate them when needed?",
  ],
  "TF-008": [
    "Should numeric 1 and string '1' identify the same task?",
    "Explain how you keep the first occurrence while preserving input order.",
    "Compare a Set with repeated array scans as the import grows.",
  ],
  "TF-009": [
    "Can an invalid action partly change the input before throwing?",
    "Explain how you preserve the contract across all five action types.",
    "Compare branching by action type with a handler registry.",
  ],
  "TF-010": [
    "Could a title be interpreted as markup?",
    "Explain the boundary between user text and DOM structure.",
    "How would you render thousands of tasks without freezing the page?",
  ],
  "TF-011": [
    "What happens when a click lands on a child of the intended target?",
    "Trace the event from its target to the delegated handler.",
    "Compare one delegated listener with a listener on every row.",
  ],
  "TF-012": [
    "Do you check title length before or after trimming?",
    "Trace empty text and an 81-character title through the returned errors.",
    "Which checks still belong on a real server?",
  ],
  "TF-013": [
    "What happens to the first timer when another call arrives?",
    "Trace three rapid calls and the arguments that finally run.",
    "When would throttling be more useful than debouncing?",
  ],
  "TF-014": [
    "Which failures reject a promise and which return an error response?",
    "Explain how you distinguish a usable response from a failed request.",
    "Which requests are safe to retry and which need an idempotency key?",
  ],
  "TF-015": [
    "What should the user see after a rejection?",
    "Trace loading, success, and failure as explicit states.",
    "How could two overlapping requests make this state incorrect?",
  ],
  "TF-031": [
    "Can an empty field or special character break rendering?",
    "Explain the contract between the parent and this component.",
    "Which behavior belongs in this component and which in its parent?",
  ],
  "TF-032": [
    "What could go wrong with two state updates close together?",
    "Explain why a functional update uses the latest state.",
    "When should the parent own the completion state?",
  ],
  "TF-033": [
    "Which card identity should survive a reorder?",
    "Explain why an index key can preserve the wrong component state.",
    "What would you measure before adding virtualization?",
  ],
  "TF-034": [
    "Does pressing Enter behave the same as clicking submit?",
    "Trace the data from input state through submission and reset.",
    "How would you preserve the draft if saving to a server failed?",
  ],
  "ENG-001": [
    "Why does a cancelled edit still change the task list?",
    "Explain the aliasing bug and the smallest safe fix.",
    "Why preserve references for unchanged rows instead of cloning everything?",
  ],
  "ENG-002": [
    "Which broken implementation could pass your current checks?",
    "Explain how each assertion distinguishes correct from faulty behavior.",
    "Which behavior should a test assert without constraining implementation?",
  ],
  "ENG-003": [
    "Could retrying this failure make the outage worse?",
    "Trace attempt count and wait duration after each transient failure.",
    "What would you add before using this policy with a real payment API?",
  ],
  "ENG-004": [
    "What happens when the older request finishes last?",
    "Explain the invariant that prevents stale data from being published.",
    "Compare ignoring an old response with cancelling the underlying request.",
  ],
  "ENG-005": [
    "What happens when the same command is delivered twice?",
    "Explain the difference between a repeated command and a key conflict.",
    "What needs to be atomic and durable in a real database?",
  ],
  "ENG-006": [
    "How many jobs can start before any one finishes?",
    "Explain how your workers preserve both the concurrency bound and output order.",
    "What should happen to in-flight work when one job fails?",
  ],
};
export function coachingFor(ticket: Ticket): Coaching {
  const [predict, explain, tradeoff] = prompts[ticket.id] ?? [
    "Which assumption is most likely to fail?",
    "Explain the contract and how your code preserves it.",
    "Compare your approach with one viable alternative.",
  ];
  return {
    outcome:
      ticket.track === "engineering"
        ? "Diagnose, verify, and defend a production behavior."
        : `Use ${ticket.concepts.slice(0, 2).join(" and ")} without relying on a reference.`,
    predict,
    explain,
    tradeoff,
    evidence:
      "Record one concrete input, its expected result, and the bug it catches. Include a test you ran or a limitation you still need to check.",
    transfer:
      "Revisit from starter code tomorrow. Then apply the same idea to a different feature and explain what changed.",
  };
}
export const careerStages = [
  {
    title: "Build your foundations",
    level: "Junior foundations",
    proof:
      "Implement a small change, trace it by hand, reproduce a bug, and explain a test failure.",
    task: "Work through the core library. Use a hint when blocked, then close it and reconstruct the solution.",
    ids: ["TF-001", "TF-002", "TF-003", "ENG-001", "ENG-002"],
  },
  {
    title: "Own a feature",
    level: "Toward mid-level",
    proof:
      "Break down a feature, handle failure paths, test boundaries, and justify a maintainable implementation.",
    task: "Build the UI exercises, then handle retries, stale responses, duplicate commands, and bounded work in the engineering labs.",
    ids: ["TF-009", "TF-034", "ENG-003", "ENG-004", "ENG-005", "ENG-006"],
  },
  {
    title: "Own the consequences",
    level: "Toward senior",
    proof:
      "Resolve ambiguous requirements, compare designs, plan a safe rollout, investigate incidents, and help another engineer make progress.",
    task: "Use the transfer briefs below in a real repository. Get another person to review your design and code; record what changed after feedback.",
    ids: [],
  },
];
export const fieldAssignments = [
  {
    id: "design",
    title: "Write a decision another engineer can challenge",
    brief:
      "Taskflow must support offline edits from two devices. Define conflict behavior before choosing an implementation. Compare last-write-wins with version checks under data loss, complexity, and user experience.",
    evidence:
      "A one-page decision record: requirements, two alternatives, chosen policy, failure cases, and a reversible rollout.",
  },
  {
    id: "delivery",
    title: "Deliver a feature in a real repository",
    brief:
      "Add task labels from database through API to UI. Break it into reviewable changes. Decide validation, authorization, migration, and test boundaries. Have someone else run your setup and review the change.",
    evidence:
      "A working branch, tests for success and failure, a migration/rollback plan, and a review response explaining one change you made.",
  },
  {
    id: "incident",
    title: "Investigate an incident",
    brief:
      "After a release, task creation latency doubles and retries create duplicates. Form two hypotheses, choose logs or metrics that distinguish them, mitigate impact, and reproduce the cause locally.",
    evidence:
      "A timeline, reproduction, hypothesis rejected with evidence, regression test, and a prevention follow-up. Use a simulated incident if needed and label it.",
  },
  {
    id: "mentoring",
    title: "Make someone else's change better",
    brief:
      "Review a peer's pull request. Separate correctness issues from preferences. Explain one risk with a reproduction and offer a small fix. Ask the author to explain the final decision back to you.",
    evidence:
      "Review notes, the resulting change, and feedback from the author. If you use a simulated PR, record that it was practice.",
  },
];
