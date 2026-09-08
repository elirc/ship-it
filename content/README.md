# Authoring a Taskflow ticket

Add a `Seed` to `src/content/curriculum.ts`, or create a typed `Ticket` and add it to the appropriate sprint. IDs are globally unique. Do not set `comingSoon: false` until the complete reference suite passes.

Every playable ticket needs:

1. A user story, precise acceptance criteria, meaningful concepts, difficulty, and XP.
2. Matching `starterFiles` and `solutionFiles` paths. The first file is the entry module. Use relative imports for additional files and named exports for the tested API.
3. A hidden test source string and matching `testNames`. The `seed()` helper extracts names from `test('Name', ...)` calls. Names must be unique and stable because XP milestones use them.
4. Three hints: a conceptual nudge, pseudocode, and a nearly complete fragment with one blank. Hints are recorded without XP penalties.
5. At least two review notes, each 40 words or fewer, with an existing source path and a real reference line number. Explain a concrete tradeoff.
6. Ticket-specific coaching in `src/learning.ts`: a failure to predict, a behavior to explain, and a trade-off to defend. Tie these prompts to the actual exercise rather than a generic essay question.

```ts
const ticket: Ticket = {
  id: "TF-061",
  sprintId: "s1",
  title: "Count the open work",
  userStory: "As a user, I want an active count so that I know what remains.",
  acceptance: [
    "Return the number of tasks with done: false.",
    "An empty list returns 0.",
  ],
  starterFiles: { "src/count.js": "export function countActive(tasks) {\n}\n" },
  solutionFiles: {
    "src/count.js":
      "export function countActive(tasks) {\n  return tasks.filter(t => !t.done).length;\n}\n",
  },
  tests: `const { countActive } = subject;
test('Counts active work', () => expect(countActive([{done:false},{done:true}])).toBe(1));
test('Handles an empty list', () => expect(countActive([])).toBe(0));`,
  testNames: ["Counts active work", "Handles an empty list"],
  hints: [
    "Think about filter.",
    "Keep unfinished tasks, then read the length.",
    "return tasks.filter(t => !t.done).___;",
  ],
  review: [
    {
      file: "src/count.js",
      line: 2,
      text: "Derive the count from tasks instead of storing another value that can become stale.",
    },
    {
      file: "src/count.js",
      line: 2,
      text: "filter leaves the original array untouched, so callers can safely reuse it.",
    },
  ],
  xp: 80,
  concepts: ["Filter", "Derived state"],
  difficulty: 1,
  runtime: "worker",
};
```

## Runtime contract

Tests receive `subject` (the entry module’s exports), `test(name, callback, {bonus?: true})`, `expect`, and a captured `console`. Assertions are `toBe`, `toEqual`, `toBeTruthy`, `toThrow`, and async `toReject`. The latter takes a function returning a promise. Async tests are awaited in registration order. Every test must be independent of previous tests.

For `runtime: 'dom'` or `'react'`, tests also receive `document`, `React`, `render`, `screen`, `fireEvent`, `act`, `waitFor`, and `renderHook`. The runner bundles React 18, ReactDOM, and Testing Library. Cleanup runs after every test. Learner JSX uses `import React from 'react'`; sibling files can import each other. Other third-party learner imports must be deliberately added to the runtime’s external map and validator together.

Use injected API functions for networking. The sandbox denies real network connections. Tests should cover ordinary behavior, empty or invalid inputs, mutation risks, and one useful boundary. Bonus tests should explore a reasonable edge case rather than contradict acceptance criteria. Tests and console output have a 3-second execution budget; keep mocked delays short.

Future TypeScript tickets need genuine type-level compilation checks before release. The current runner transpiles TypeScript and Monaco shows editor type errors; neither is a substitute for a strict type-level grading suite. Future Node tickets need a documented compatible in-memory runtime or an explicit run-locally workflow.

## Validate and ship

```sh
npm run validate-content
npm test
npm run test:e2e
npm run build
```

The content validator executes each trusted reference in a separate Node worker with a timeout, so an accidental infinite loop does not hang the build. DOM/React validation uses jsdom. Browser tests execute all references in the actual production-style sandbox policy, which catches module, CSP, and DOM differences that jsdom cannot.

When adding a new runnable ticket, add it in sequence and remove its coming-soon entry. Give bosses a rubric with auto checks for executable behavior and self checks for explanation or review. Do not unlock a new sprint except through its previous boss; use an explicitly named preview only when needed to demonstrate a later runtime.

## Engineering labs and evidence

Independent engineering practice lives in `src/content/engineering.ts`. Use an `ENG-` ID, `track: "engineering"`, and recommended `prerequisites`. Labs are available from Growth plan without claiming that earlier sprints are complete. Start with a credible bug or an inadequate test suite. Verify both that the reference passes and that the starter fails. For asynchronous behavior, control completion order with deferred promises instead of relying on wall-clock races.

Explain which guarantees the exercise can prove and which require a real system. For example, an in-memory idempotency exercise does not prove durability or atomicity across processes. A concurrency bound does not establish a requests-per-second rate limit.

Planning notes, explanation, evidence, and trade-offs are learner-authored. Their presence must not be scored as correct reasoning. Recall reuses a ticket's suite against a separate starter-code draft; it checks repeated implementation, not novel transfer or external-help detection. Broader assignments in `src/learning.ts` have explicit artifacts and human feedback rather than simulated grading.
