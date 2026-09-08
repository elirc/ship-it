import type { BossTicket, Sprint, Ticket } from "../types";
import { engineeringTickets } from "./engineering";

type Seed = {
  id: string;
  sprint: number;
  title: string;
  story: string;
  acceptance: string[];
  concepts: string[];
  starter: string;
  solution: string;
  tests: string;
  hints: [string, string, string];
  notes: [string, string];
  runtime?: Ticket["runtime"];
  file?: string;
  xp?: number;
  difficulty?: Ticket["difficulty"];
};
function seed(s: Seed): Ticket {
  const file =
    s.file ?? (s.runtime === "react" ? "src/App.jsx" : "src/tasks.js");
  return {
    id: s.id,
    sprintId: `s${s.sprint}`,
    title: s.title,
    userStory: s.story,
    acceptance: s.acceptance,
    concepts: s.concepts,
    starterFiles: { [file]: s.starter },
    solutionFiles: { [file]: s.solution },
    tests: s.tests,
    hints: s.hints,
    review: s.notes.map((text, i) => ({
      file,
      line:
        i === 0
          ? 2
          : Math.max(
              1,
              Math.min(5, s.solution.trimEnd().split("\n").length - 1),
            ),
      text,
    })),
    xp: s.xp ?? 100,
    difficulty: s.difficulty ?? 1,
    runtime: s.runtime ?? "worker",
    testNames: [...s.tests.matchAll(/test\('([^']+)'/g)].map((m) => m[1]),
  };
}
const core: Ticket[] = [
  seed({
    id: "TF-001",
    sprint: 1,
    title: "Give a task its first breath",
    story:
      "As a user, I want to create a task so that I can get an idea out of my head and into my workspace.",
    acceptance: [
      "Return an object with id, title, project, and done fields.",
      "Trim whitespace from the title. Start every task with done: false.",
      'Default the project to "Inbox" when it is not provided.',
      "Throw an error when the title is empty or is not a string.",
    ],
    concepts: ["Objects", "Functions", "Validation"],
    starter: `/**
 * Taskflow core · Task creation
 *
 * A task starts here. Make it a good one.
 * @param {string} title
 * @param {string} id
 * @param {string} [project="Inbox"]
 */
export function createTask(title, id, project = "Inbox") {
  // Turn the input into a task object.

}
`,
    solution: `export function createTask(title, id, project = "Inbox") {
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("A task needs a title");
  }
  return { id, title: title.trim(), project, done: false };
}
`,
    tests: `const { createTask } = subject;
test('Creates a task with the right shape', () => { expect(createTask('Ship the landing page','t1','Website')).toEqual({id:'t1',title:'Ship the landing page',project:'Website',done:false}); });
test('Trims whitespace from the title', () => { expect(createTask('  Fix navigation  ','t2').title).toBe('Fix navigation'); });
test('Defaults the project to Inbox', () => { expect(createTask('Write a test','t3').project).toBe('Inbox'); });
test('Rejects empty and invalid titles', () => { expect(() => createTask('   ','t4')).toThrow(); expect(() => createTask(null,'t5')).toThrow(); expect(() => createTask(42,'t6')).toThrow(); });
test('Creates independent task objects', () => { const first = createTask('First','same'); const second = createTask('Second','same'); expect(first === second).toBe(false); expect(first.title).toBe('First'); expect(second.title).toBe('Second'); }, {bonus:true});`,
    hints: [
      "Validate the input first, then return an object literal. String.trim() removes surrounding spaces.",
      "If title is not a string or its trimmed value is empty, throw. Return { id, title: trimmedTitle, project, done: false }.",
      'if (typeof title !== "string" || !title.trim()) throw new Error("Title required");\nreturn { id, title: title.___(), project, done: false };',
    ],
    notes: [
      "Guard clauses keep invalid inputs out of the happy path. Check the type before calling string methods.",
      "Object shorthand keeps the return value easy to scan. Default parameters put the default where callers can find it.",
    ],
  }),
  seed({
    id: "TF-002",
    sprint: 1,
    title: "Mark it done. Or not.",
    story:
      "As a user, I want to toggle a task so that my list reflects what is actually done.",
    acceptance: [
      "Return a new task with done inverted.",
      "Preserve every other field. Never mutate the original task.",
    ],
    concepts: ["Immutability", "Spread", "Booleans"],
    starter:
      "export function toggleDone(task) {\n  // Return a changed copy.\n}\n",
    solution:
      "export function toggleDone(task) {\n  return { ...task, done: !task.done };\n}\n",
    tests: `const {toggleDone} = subject;
test('Completes an open task',()=>expect(toggleDone({id:'1',done:false}).done).toBe(true));
test('Reopens a completed task',()=>expect(toggleDone({id:'1',done:true}).done).toBe(false));
test('Preserves the original and its fields',()=>{const task=Object.freeze({id:'1',title:'Build',done:false}); const result=toggleDone(task); expect(result).toEqual({id:'1',title:'Build',done:true}); expect(result===task).toBe(false);});`,
    hints: [
      "Spread makes a shallow copy. The last property wins.",
      "Copy all task properties, then override done with its opposite.",
      "return { ...task, done: ___task.done };",
    ],
    notes: [
      "Put the override after the spread so an old value cannot overwrite it.",
      "A new object lets React and other consumers detect changes using reference equality.",
    ],
  }),
  seed({
    id: "TF-003",
    sprint: 1,
    title: "Find the signal in the list",
    story:
      "As a user, I want to filter all, active, or completed tasks so that I can focus on the work ahead.",
    acceptance: [
      "Support all, active, and completed filters.",
      "Unknown filters throw an error.",
      "Return a new array, including for all.",
    ],
    concepts: ["Arrays", "Filter", "Immutability"],
    starter: 'export function filterTasks(tasks, filter = "all") {\n\n}\n',
    solution: `export function filterTasks(tasks, filter = "all") {
  if (!["all", "active", "completed"].includes(filter)) throw new Error("Unknown filter");
  return tasks.filter(task => filter === "all" || task.done === (filter === "completed"));
}
`,
    tests: `const {filterTasks}=subject; const tasks=[{id:'1',done:false},{id:'2',done:true}];
test('Finds active tasks',()=>expect(filterTasks(tasks,'active')).toEqual([tasks[0]]));
test('Finds completed tasks',()=>expect(filterTasks(tasks,'completed')).toEqual([tasks[1]]));
test('Returns a copy for all tasks',()=>{expect(filterTasks(tasks)).toEqual(tasks);expect(filterTasks(tasks)===tasks).toBe(false);});
test('Handles empty arrays and invalid filters',()=>{expect(filterTasks([],'active')).toEqual([]);expect(()=>filterTasks(tasks,'wat')).toThrow();});`,
    hints: [
      "filter creates a new array containing items whose predicate returns true.",
      "Validate the filter. Keep everything for all; otherwise compare done with the requested status.",
      'return tasks.filter(task => filter === "all" || task.done === (filter === "___"));',
    ],
    notes: [
      "Validate the command before walking the list. Invalid input should not silently look like an empty result.",
      "One predicate avoids separate loops and always preserves the input array.",
    ],
  }),
  seed({
    id: "TF-004",
    sprint: 1,
    title: "Put the deadline first",
    story:
      "As a user, I want the soonest due tasks first so that urgent work does not get lost.",
    acceptance: [
      "Sort ascending by ISO due date.",
      "Place missing and invalid dates last. Keep ties in their original order.",
      "Do not mutate the input array.",
    ],
    concepts: ["Sorting", "Date", "Edge cases"],
    difficulty: 2,
    starter: "export function sortByDue(tasks) {\n\n}\n",
    solution: `export function sortByDue(tasks) {
  const time = task => { const value = Date.parse(task.due); return Number.isNaN(value) ? Infinity : value; };
  return [...tasks].sort((a, b) => time(a) - time(b));
}
`,
    tests: `const {sortByDue}=subject;
test('Sorts by nearest date',()=>expect(sortByDue([{id:2,due:'2026-06-02'},{id:1,due:'2026-06-01'}]).map(t=>t.id)).toEqual([1,2]));
test('Places absent and invalid dates last',()=>expect(sortByDue([{id:3},{id:1,due:'2026-01-01'},{id:4,due:'no'}]).map(t=>t.id)).toEqual([1,3,4]));
test('Does not mutate the input',()=>{const a=Object.freeze([{id:2,due:'2026-02-01'},{id:1,due:'2026-01-01'}]);expect(sortByDue(a)[0].id).toBe(1);});
test('Preserves ties and empty input',()=>{expect(sortByDue([])).toEqual([]);expect(sortByDue([{id:1},{id:2}]).map(t=>t.id)).toEqual([1,2]);});`,
    hints: [
      "sort mutates its array. Copy first. Treat an invalid date as Infinity.",
      "Create a date-to-number helper. Sort a copy using helper(a) minus helper(b).",
      "const time = t => Number.isNaN(Date.parse(t.due)) ? Infinity : Date.parse(t.due);\nreturn [...tasks].sort((a,b) => time(a) ___ time(b));",
    ],
    notes: [
      "Normalize dates in one helper so both sides of the comparison follow the same rules.",
      "Sorting a copy is a small cost that prevents surprising changes elsewhere in the product.",
    ],
  }),
  seed({
    id: "TF-005",
    sprint: 1,
    title: "A home for every task",
    story:
      "As a user, I want tasks grouped by project so that I can see each workstream together.",
    acceptance: [
      "Return an object mapping project names to task arrays.",
      "Use Inbox for missing project names.",
      "Handle unusual keys such as __proto__ without losing tasks.",
    ],
    concepts: ["Objects", "Reduce", "Edge cases"],
    difficulty: 2,
    starter: "export function groupByProject(tasks) {\n\n}\n",
    solution: `export function groupByProject(tasks) {
  return tasks.reduce((groups, task) => {
    const key = task.project || "Inbox";
    (groups[key] ??= []).push(task);
    return groups;
  }, Object.create(null));
}
`,
    tests: `const {groupByProject}=subject;
test('Groups tasks by project',()=>{const a={id:1,project:'Web'},b={id:2,project:'Web'};expect(groupByProject([a,b]).Web).toEqual([a,b]);});
test('Defaults unassigned tasks to Inbox',()=>expect(groupByProject([{id:1}]).Inbox).toEqual([{id:1}]));
test('Returns no groups for an empty list',()=>expect(Object.keys(groupByProject([]))).toEqual([]));
test('Handles reserved object keys',()=>expect(groupByProject([{id:1,project:'__proto__'}])['__proto__']).toEqual([{id:1,project:'__proto__'}]),{bonus:true});`,
    hints: [
      "Use an accumulator keyed by project. A null-prototype object has no inherited keys.",
      "Reduce into Object.create(null). Initialize a group array once, then push its tasks.",
      'const key = task.project || "Inbox";\n(groups[key] ??= []).___(task);',
    ],
    notes: [
      "User-defined keys can collide with Object.prototype. A null-prototype dictionary avoids that class of bug.",
      "Mutation of a fresh local accumulator is fine: it never changes the caller’s objects.",
    ],
  }),
  seed({
    id: "TF-006",
    sprint: 1,
    title: "Search without the noise",
    story:
      "As a user, I want case-insensitive search so that I can find a task with just part of its title.",
    acceptance: [
      "Match title substrings without case sensitivity.",
      "Trim the query. An empty query returns a copy of all tasks.",
      "Treat missing titles as empty strings.",
    ],
    concepts: ["Strings", "Filter", "Normalization"],
    starter: "export function searchTasks(tasks, query) {\n\n}\n",
    solution: `export function searchTasks(tasks, query) {
  const needle = query.trim().toLowerCase();
  return tasks.filter(task => (task.title ?? "").toLowerCase().includes(needle));
}
`,
    tests: `const {searchTasks}=subject;const tasks=[{title:'Ship React'},{title:'Fix CSS'},{}];
test('Matches part of a title',()=>expect(searchTasks(tasks,'react')).toEqual([tasks[0]]));
test('Ignores case and query whitespace',()=>expect(searchTasks(tasks,'  SHIP ')).toEqual([tasks[0]]));
test('Returns all for empty search',()=>{expect(searchTasks(tasks,'')).toEqual(tasks);expect(searchTasks(tasks,'')===tasks).toBe(false);});
test('Returns empty for no matches',()=>expect(searchTasks(tasks,'python')).toEqual([]));`,
    hints: [
      "Normalize the query once before filtering.",
      "Lowercase and trim the query, then check whether each lowercased title includes it.",
      'return tasks.filter(task => (task.title ?? "").toLowerCase().___(needle));',
    ],
    notes: [
      "Compute the normalized query once. Repeating it for every task adds work without adding clarity.",
      "Nullish coalescing documents the fallback for absent titles without hiding other values.",
    ],
  }),
  seed({
    id: "TF-007",
    sprint: 1,
    title: "Make progress measurable",
    story:
      "As a user, I want a completion summary so that I can see how much work remains.",
    acceptance: [
      "Return total, completed, active, and percent.",
      "Round percent to the nearest integer.",
      "An empty list has a completion percentage of zero.",
    ],
    concepts: ["Reduce", "Math", "Derived state"],
    difficulty: 2,
    starter: "export function computeStats(tasks) {\n\n}\n",
    solution: `export function computeStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(task => task.done).length;
  return { total, completed, active: total - completed, percent: total ? Math.round(completed / total * 100) : 0 };
}
`,
    tests: `const {computeStats}=subject;
test('Counts active and completed tasks',()=>expect(computeStats([{done:true},{done:false}])).toEqual({total:2,completed:1,active:1,percent:50}));
test('Rounds the percentage',()=>expect(computeStats([{done:true},{done:false},{done:false}]).percent).toBe(33));
test('Handles an empty workspace',()=>expect(computeStats([])).toEqual({total:0,completed:0,active:0,percent:0}));`,
    hints: [
      "Derive active from total minus completed. Guard division by zero.",
      "Count completed tasks, then derive the other fields. Round completed / total * 100.",
      "percent: total ? Math.round(completed / total * 100) : ___",
    ],
    notes: [
      "Derived state prevents counts from drifting out of sync. Store tasks; calculate their summary.",
      "The empty-list branch makes the API return useful numbers instead of NaN.",
    ],
  }),
  seed({
    id: "TF-008",
    sprint: 1,
    title: "One task. One identity.",
    story:
      "As a user, I want duplicate tasks removed so that imports do not clutter my workspace.",
    acceptance: [
      "Keep the first task for each id, preserving order.",
      "Do not mutate the input.",
      'Distinct IDs must remain distinct, including number 1 and string "1".',
    ],
    concepts: ["Set", "Identity", "Arrays"],
    difficulty: 2,
    starter: "export function dedupeTasks(tasks) {\n\n}\n",
    solution: `export function dedupeTasks(tasks) {
  const seen = new Set();
  return tasks.filter(task => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
}
`,
    tests: `const {dedupeTasks}=subject;
test('Keeps the first occurrence',()=>expect(dedupeTasks([{id:1,title:'first'},{id:1,title:'second'}])).toEqual([{id:1,title:'first'}]));
test('Preserves original order',()=>expect(dedupeTasks([{id:2},{id:1},{id:2},{id:3}])).toEqual([{id:2},{id:1},{id:3}]));
test('Handles empty input and distinct ID types',()=>{expect(dedupeTasks([])).toEqual([]);expect(dedupeTasks([{id:1},{id:'1'}]).length).toBe(2);});`,
    hints: [
      "A Set remembers IDs without converting them into strings.",
      "Filter the list. Skip a task when the set already has its ID; otherwise record it and keep it.",
      "if (seen.has(task.id)) return false;\nseen.___(task.id);\nreturn true;",
    ],
    notes: [
      "A Set avoids the repeated scans of findIndex and preserves the distinction between numeric and string IDs.",
      "Keeping the first item makes importing duplicate data predictable.",
    ],
  }),
];
const coreBoss = {
  ...seed({
    id: "TF-009",
    sprint: 1,
    title: "Boss: take control of the backlog",
    story:
      "As a user, I want to edit many tasks at once so that maintaining a busy backlog takes seconds.",
    acceptance: [
      "applyBulkAction(tasks, action) supports complete, reopen, delete, move, and rename.",
      "Use action.ids to select tasks. Unknown IDs are ignored.",
      "move requires a nonempty project; rename requires a nonempty title. Trim both.",
      "Reject unknown types and a missing/non-array ids field. Preserve the original tasks.",
    ],
    concepts: ["Validation", "Immutability", "Composition"],
    difficulty: 3,
    xp: 300,
    starter:
      "export function applyBulkAction(tasks, action) {\n  // Validate the action before changing the backlog.\n}\n",
    solution: `export function applyBulkAction(tasks, action) {
  if (!action || !Array.isArray(action.ids)) throw new Error("IDs required");
  if (!["complete", "reopen", "delete", "move", "rename"].includes(action.type)) throw new Error("Unknown action");
  const field = action.type === "move" ? "project" : action.type === "rename" ? "title" : null;
  if (field && (typeof action[field] !== "string" || !action[field].trim())) throw new Error("Value required");
  const ids = new Set(action.ids);
  return tasks.filter(task => !(action.type === "delete" && ids.has(task.id))).map(task => {
    if (!ids.has(task.id)) return task;
    if (field) return { ...task, [field]: action[field].trim() };
    return { ...task, done: action.type === "complete" };
  });
}
`,
    tests: `const {applyBulkAction:run}=subject;const tasks=[{id:'a',title:'A',done:false,project:'Inbox'},{id:'b',title:'B',done:true,project:'Inbox'}];
test('Completes selected tasks',()=>expect(run(tasks,{type:'complete',ids:['a']})[0].done).toBe(true));
test('Reopens selected tasks',()=>expect(run(tasks,{type:'reopen',ids:['b']})[1].done).toBe(false));
test('Deletes only selected tasks',()=>expect(run(tasks,{type:'delete',ids:['a','unknown']})).toEqual([tasks[1]]));
test('Moves and renames with trimmed values',()=>{expect(run(tasks,{type:'move',ids:['a'],project:' Web '})[0].project).toBe('Web');expect(run(tasks,{type:'rename',ids:['b'],title:' Bee '})[1].title).toBe('Bee');});
test('Rejects malformed actions',()=>{for(const action of [null,{}, {type:'bad',ids:[]},{type:'move',ids:[],project:' '},{type:'rename',ids:['a'],title:1}])expect(()=>run(tasks,action)).toThrow();});
test('Preserves original data and empty selections',()=>{const before=JSON.stringify(tasks);expect(run(tasks,{type:'complete',ids:[]})).toEqual(tasks);run(tasks,{type:'complete',ids:['a']});expect(JSON.stringify(tasks)).toBe(before);});`,
    hints: [
      "Validate once. Use a Set for selected IDs and separate deletion from updates.",
      "Filter deleted tasks, then map over the survivors. Return unselected tasks unchanged.",
      'return tasks.filter(t => !(action.type === "delete" && ids.has(t.id))).map(t => {\n  if (!ids.has(t.id)) return t;\n  if (field) return { ...t, [field]: action[field].trim() };\n  return { ...t, done: action.type === "___" };\n});',
    ],
    notes: [
      "Validate before touching data so the operation is atomic: every input is accepted, or nothing changes.",
      "Use the same selection set for every action. Consistent semantics matter more than clever branching.",
    ],
  }),
  parMinutes: 20,
  rubric: [
    {
      id: "actions",
      label: "All five bulk actions pass",
      check: "auto" as const,
    },
    {
      id: "readability",
      label: "I can explain the validation and immutability choices",
      check: "self" as const,
    },
  ],
} satisfies BossTicket;

const dom: Ticket[] = [
  seed({
    id: "TF-010",
    sprint: 2,
    title: "Bring the backlog to the screen",
    story:
      "As a user, I want to see my task list so that I can browse my work.",
    acceptance: [
      "renderTasks(container, tasks) replaces the container contents with a ul.",
      "Render each title in an li with data-id set to the task ID.",
      "Use textContent so markup in titles is displayed as text.",
    ],
    concepts: ["DOM", "Rendering", "Sanitization"],
    runtime: "dom",
    starter: "export function renderTasks(container, tasks) {\n\n}\n",
    solution: `export function renderTasks(container, tasks) {
  const list = document.createElement("ul");
  for (const task of tasks) {
    const item = document.createElement("li");
    item.dataset.id = task.id;
    item.textContent = task.title;
    list.append(item);
  }
  container.replaceChildren(list);
}
`,
    tests: `const {renderTasks}=subject;
test('Renders titles and IDs',()=>{const el=document.createElement('div');renderTasks(el,[{id:'a',title:'Ship'}]);expect(el.querySelector('li').textContent).toBe('Ship');expect(el.querySelector('li').dataset.id).toBe('a');});
test('Replaces stale tasks and handles empty lists',()=>{const el=document.createElement('div');el.innerHTML='<p>old</p>';renderTasks(el,[]);expect(el.innerHTML).toBe('<ul></ul>');});
test('Displays user input as text',()=>{const el=document.createElement('div');renderTasks(el,[{id:'a',title:'<img src=x>'}]);expect(el.querySelector('img')).toBe(null);expect(el.textContent).toBe('<img src=x>');},{bonus:true});`,
    hints: [
      "Build elements with createElement and assign titles through textContent.",
      "Create a ul, append one li per task, then replaceChildren on the container.",
      "item.dataset.id = task.id;\nitem.___ = task.title;\nlist.append(item);",
    ],
    notes: [
      "textContent treats a title as data. innerHTML would interpret it as executable markup.",
      "Replacing the container makes rendering deterministic and avoids duplicating old rows.",
    ],
  }),
  seed({
    id: "TF-011",
    sprint: 2,
    title: "One listener. Every task.",
    story:
      "As a user, I want to click any task toggle so that even newly added rows respond.",
    acceptance: [
      "bindTaskEvents(container, onToggle) delegates clicks to [data-task-id] elements.",
      "Support clicks on nested children. Ignore other clicks.",
      "Return an unbind function that removes the listener.",
    ],
    concepts: ["Events", "Delegation", "Cleanup"],
    runtime: "dom",
    starter: "export function bindTaskEvents(container, onToggle) {\n\n}\n",
    solution: `export function bindTaskEvents(container, onToggle) {
  const handler = event => {
    const target = event.target.closest("[data-task-id]");
    if (target && container.contains(target)) onToggle(target.dataset.taskId);
  };
  container.addEventListener("click", handler);
  return () => container.removeEventListener("click", handler);
}
`,
    tests: `const {bindTaskEvents}=subject;
test('Handles nested clicks on dynamically added buttons',()=>{const el=document.createElement('div');const ids=[];bindTaskEvents(el,id=>ids.push(id));el.innerHTML='<button data-task-id="a"><span>Toggle</span></button>';el.querySelector('span').click();expect(ids).toEqual(['a']);});
test('Ignores unrelated clicks',()=>{const el=document.createElement('div');let n=0;bindTaskEvents(el,()=>n++);el.click();expect(n).toBe(0);});
test('Unbind removes the handler',()=>{const el=document.createElement('div');el.innerHTML='<button data-task-id="a">x</button>';let n=0;const unbind=bindTaskEvents(el,()=>n++);unbind();el.querySelector('button').click();expect(n).toBe(0);});`,
    hints: [
      "Listen on the container and use closest to find an actionable ancestor.",
      "Capture the listener in a variable so you can remove that exact function later.",
      'const target = event.target.closest("[data-task-id]");\nif (target && container.contains(target)) onToggle(target.dataset.___);',
    ],
    notes: [
      "Delegation covers future rows without attaching another listener every time the list changes.",
      "Returning cleanup gives callers ownership of the listener’s lifetime.",
    ],
  }),
  seed({
    id: "TF-012",
    sprint: 2,
    title: "Catch a bad task before it lands",
    story:
      "As a user, I want useful form errors so that I know how to fix an invalid task.",
    acceptance: [
      "validateTaskForm({title}) returns {valid, errors, value}.",
      "Title must be a string with 1–80 trimmed characters.",
      'errors.title is "Title is required" or "Keep it under 81 characters". value.title is trimmed.',
    ],
    concepts: ["Validation", "Forms", "Strings"],
    starter: "export function validateTaskForm(input) {\n\n}\n",
    solution: `export function validateTaskForm(input) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const errors = {};
  if (!title) errors.title = "Title is required";
  else if (title.length > 80) errors.title = "Keep it under 81 characters";
  return { valid: Object.keys(errors).length === 0, errors, value: { title } };
}
`,
    tests: `const {validateTaskForm:v}=subject;
test('Accepts and trims a valid title',()=>expect(v({title:' Ship '})).toEqual({valid:true,errors:{},value:{title:'Ship'}}));
test('Explains missing titles',()=>{expect(v({title:' '}).errors.title).toBe('Title is required');expect(v({}).valid).toBe(false);});
test('Enforces the 80 character boundary',()=>{expect(v({title:'a'.repeat(80)}).valid).toBe(true);expect(v({title:'a'.repeat(81)}).errors.title).toBe('Keep it under 81 characters');});`,
    hints: [
      "Normalize before checking length. Use an errors object keyed by field.",
      "Build the title string safely, set the relevant error, and derive valid from the number of errors.",
      "return { valid: Object.keys(errors).length === ___, errors, value: { title } };",
    ],
    notes: [
      "A structured error map scales to more fields and lets the UI place errors beside their inputs.",
      "Validation and normalization share a boundary so the saved value is exactly the value you checked.",
    ],
  }),
  seed({
    id: "TF-013",
    sprint: 2,
    title: "Let the typing settle",
    story:
      "As a user, I want search to wait until I pause typing so that the interface stays responsive.",
    acceptance: [
      "debounce(fn, delay) returns a function that calls fn only after the delay.",
      "Later calls cancel earlier pending calls. Forward the latest arguments and this.",
      "The returned function has cancel() to discard pending work.",
    ],
    concepts: ["Closures", "Timers", "Debounce"],
    difficulty: 2,
    starter: "export function debounce(fn, delay) {\n\n}\n",
    solution: `export function debounce(fn, delay) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
`,
    tests: `const {debounce}=subject;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('Waits before calling the function',async()=>{let n=0;const fn=debounce(()=>n++,20);fn();expect(n).toBe(0);await sleep(40);expect(n).toBe(1);});
test('Uses the latest arguments and receiver',async()=>{let out;const fn=debounce(function(v){out=this.prefix+v;},20);fn.call({prefix:'a'},1);fn.call({prefix:'b'},2);await sleep(40);expect(out).toBe('b2');});
test('Cancels pending work',async()=>{let n=0;const fn=debounce(()=>n++,20);fn();fn.cancel();await sleep(40);expect(n).toBe(0);});`,
    hints: [
      "Keep the timer handle in a closure. Clear it on every call.",
      "Use a normal function to preserve this, rest parameters for arguments, and fn.apply inside the timer.",
      "timer = setTimeout(() => fn.___(this, args), delay);",
    ],
    notes: [
      "Closures hold per-instance state without a global timer that could interfere with other search fields.",
      "Cancellation prevents delayed callbacks from updating a screen after it has been removed.",
    ],
  }),
  seed({
    id: "TF-014",
    sprint: 2,
    title: "Meet your first API",
    story:
      "As a user, I want tasks loaded from the API so that my workspace reflects saved data.",
    acceptance: [
      "fetchTasks(fetcher, signal) requests /api/tasks and forwards the signal.",
      "Return the JSON array on success. The fetcher is an injected in-memory mock.",
      'Throw "Request failed: STATUS" for unsuccessful responses and "Invalid tasks" for non-array JSON.',
    ],
    concepts: ["Async/await", "HTTP", "AbortController"],
    difficulty: 2,
    starter: "export async function fetchTasks(fetcher, signal) {\n\n}\n",
    solution: `export async function fetchTasks(fetcher, signal) {
  const response = await fetcher("/api/tasks", { signal });
  if (!response.ok) throw new Error("Request failed: " + response.status);
  const tasks = await response.json();
  if (!Array.isArray(tasks)) throw new Error("Invalid tasks");
  return tasks;
}
`,
    tests: `const {fetchTasks}=subject;
test('Loads tasks from the correct endpoint',async()=>{let url;const rows=[{id:1}];expect(await fetchTasks(async u=>{url=u;return {ok:true,json:async()=>rows};})).toEqual(rows);expect(url).toBe('/api/tasks');});
test('Reports unsuccessful HTTP responses',async()=>{await expect(()=>fetchTasks(async()=>({ok:false,status:503}))).toReject('Request failed: 503');});
test('Rejects invalid response bodies',async()=>{await expect(()=>fetchTasks(async()=>({ok:true,json:async()=>({})}))).toReject('Invalid tasks');});
test('Forwards the abort signal',async()=>{const signal=new AbortController().signal;let actual;await fetchTasks(async(u,o)=>{actual=o.signal;return {ok:true,json:async()=>[]};},signal);expect(actual===signal).toBe(true);});`,
    hints: [
      "await the response, check ok, then await json. fetch does not reject for HTTP error statuses.",
      "Inject the transport so tests control the network. Validate the parsed response before returning it.",
      'if (!response.ok) throw new Error("Request failed: " + response.status);\nconst tasks = await response.___();',
    ],
    notes: [
      "Transport injection makes the same function usable with real fetch or an in-memory API.",
      "Check the HTTP status before parsing so an error page does not become an unrelated JSON error.",
    ],
  }),
  seed({
    id: "TF-015",
    sprint: 2,
    title: "Give every request a state",
    story:
      "As a user, I want loading and error feedback so that a slow or failed request never looks like an empty workspace.",
    acceptance: [
      'loadTasks(fetcher, onState) emits {status:"loading", tasks:[], error:null} first.',
      'On success emit {status:"success", tasks:result, error:null}.',
      'On rejection emit {status:"error", tasks:[], error:message}. Do not rethrow.',
    ],
    concepts: ["Async/await", "State machines", "Error handling"],
    difficulty: 2,
    starter: "export async function loadTasks(fetcher, onState) {\n\n}\n",
    solution: `export async function loadTasks(fetcher, onState) {
  onState({ status: "loading", tasks: [], error: null });
  try {
    const tasks = await fetcher();
    onState({ status: "success", tasks, error: null });
  } catch (error) {
    onState({ status: "error", tasks: [], error: error instanceof Error ? error.message : String(error) });
  }
}
`,
    tests: `const {loadTasks}=subject;
test('Emits loading before success',async()=>{const states=[];await loadTasks(async()=>[{id:1}],s=>states.push(s));expect(states).toEqual([{status:'loading',tasks:[],error:null},{status:'success',tasks:[{id:1}],error:null}]);});
test('Emits a useful error state',async()=>{const states=[];await loadTasks(async()=>{throw new Error('Offline');},s=>states.push(s));expect(states[1]).toEqual({status:'error',tasks:[],error:'Offline'});});
test('Handles non-Error rejections',async()=>{const states=[];await loadTasks(async()=>{throw 'Unavailable';},s=>states.push(s));expect(states[1].error).toBe('Unavailable');},{bonus:true});`,
    hints: [
      "Emit loading synchronously, then use try/catch around the awaited request.",
      "Both the happy path and the error path should emit a complete state object.",
      'catch (error) { onState({status:"error", tasks:[], error:error instanceof Error ? error.___ : String(error)}); }',
    ],
    notes: [
      "Explicit states prevent impossible UI combinations such as loading and an old error at the same time.",
      "JavaScript can throw any value. Narrow before reading message so failures remain useful.",
    ],
  }),
];

const react: Ticket[] = [
  seed({
    id: "TF-031",
    sprint: 4,
    title: "Your first piece of the interface",
    story:
      "As a user, I want a task card so that I can read a task and see its status at a glance.",
    acceptance: [
      "Export TaskCard({ task }) as a named React component.",
      'Render the title as a heading and "Completed" or "Active" as visible text.',
      "Render an article with an accessible label equal to the title.",
    ],
    concepts: ["JSX", "Components", "Props"],
    runtime: "react",
    starter:
      'import React from "react";\n\nexport function TaskCard({ task }) {\n  return <article>Build your task card here.</article>;\n}\n',
    solution: `import React from "react";
export function TaskCard({ task }) {
  return <article aria-label={task.title}>
    <h2>{task.title}</h2>
    <span>{task.done ? "Completed" : "Active"}</span>
  </article>;
}
`,
    tests: `const {TaskCard}=subject;
test('Renders the task title as a heading',()=>{render(React.createElement(TaskCard,{task:{title:'Ship UI',done:false}}));expect(screen.getByRole('heading',{name:'Ship UI'}).textContent).toBe('Ship UI');});
test('Shows the task status',()=>{render(React.createElement(TaskCard,{task:{title:'Done',done:true}}));expect(screen.getByText('Completed').textContent).toBe('Completed');});
test('Labels the article and shows active status',()=>{render(React.createElement(TaskCard,{task:{title:'Build',done:false}}));expect(screen.getByRole('article',{name:'Build'})).toBeTruthy();expect(screen.getByText('Active')).toBeTruthy();});`,
    hints: [
      "Destructure task from props and use JSX expressions for title and status.",
      "Use an article with aria-label, an h2 for the title, and a conditional span for status.",
      '<span>{task.done ? "Completed" : "___"}</span>',
    ],
    notes: [
      "Semantic elements make the interface easier to navigate and make tests read like user behavior.",
      "Derive status text from props. Local state would duplicate data and eventually become stale.",
    ],
  }),
  seed({
    id: "TF-032",
    sprint: 4,
    title: "A checkbox that remembers",
    story:
      "As a user, I want an interactive task checkbox so that I can mark work complete.",
    acceptance: [
      "Export TaskToggle({ title, initialDone = false }).",
      "Render a checkbox labeled with title. Initialize it from initialDone.",
      "Clicking toggles the checkbox using React state.",
    ],
    concepts: ["useState", "Events", "Accessibility"],
    runtime: "react",
    starter:
      'import React, { useState } from "react";\n\nexport function TaskToggle({ title, initialDone = false }) {\n  return <label>{title}</label>;\n}\n',
    solution: `import React, { useState } from "react";
export function TaskToggle({ title, initialDone = false }) {
  const [done, setDone] = useState(initialDone);
  return <label><input type="checkbox" checked={done} onChange={() => setDone(value => !value)} />{title}</label>;
}
`,
    tests: `const {TaskToggle}=subject;
test('Starts unchecked by default',()=>{render(React.createElement(TaskToggle,{title:'Build'}));expect(screen.getByRole('checkbox',{name:'Build'}).checked).toBe(false);});
test('Uses the initial completion state',()=>{render(React.createElement(TaskToggle,{title:'Ship',initialDone:true}));expect(screen.getByRole('checkbox').checked).toBe(true);});
test('Toggles on repeated clicks',()=>{render(React.createElement(TaskToggle,{title:'Test'}));const box=screen.getByRole('checkbox');fireEvent.click(box);expect(box.checked).toBe(true);fireEvent.click(box);expect(box.checked).toBe(false);});`,
    hints: [
      "Use useState(initialDone) and bind the checkbox checked property.",
      "Wrap the input in a label. Toggle state in onChange with a functional update.",
      'const [done, setDone] = useState(initialDone);\n<input type="checkbox" checked={done} onChange={() => setDone(value => ___value)} />',
    ],
    notes: [
      "A functional state update always uses the latest value, including during batched updates.",
      "A real label expands the click target and gives screen readers a useful checkbox name.",
    ],
  }),
  seed({
    id: "TF-033",
    sprint: 4,
    title: "Turn data into a task list",
    story:
      "As a user, I want my tasks rendered as cards so that the backlog stays readable as it grows.",
    acceptance: [
      "Export TaskList({ tasks }) and use the provided TaskCard component.",
      "Render one card per task using task.id as its key.",
      'When empty, show "No tasks yet. Make something happen."',
    ],
    concepts: ["Lists & keys", "Composition", "Empty states"],
    runtime: "react",
    starter:
      'import React from "react";\nimport { TaskCard } from "./TaskCard";\n\nexport function TaskList({ tasks }) {\n  return <section />;\n}\n',
    solution: `import React from "react";
import { TaskCard } from "./TaskCard";
export function TaskList({ tasks }) {
  if (!tasks.length) return <p>No tasks yet. Make something happen.</p>;
  return <section>{tasks.map(task => <TaskCard key={task.id} task={task} />)}</section>;
}
`,
    tests: `const {TaskList}=subject;
test('Renders every task using a card',()=>{render(React.createElement(TaskList,{tasks:[{id:'a',title:'Build'},{id:'b',title:'Test'}]}));expect(screen.getAllByRole('article').length).toBe(2);expect(screen.getByRole('heading',{name:'Test'})).toBeTruthy();});
test('Explains an empty backlog',()=>{render(React.createElement(TaskList,{tasks:[]}));expect(screen.getByText('No tasks yet. Make something happen.')).toBeTruthy();});
test('Keeps card identity across reordering',()=>{const a={id:'a',title:'Build'},b={id:'b',title:'Test'};const view=render(React.createElement(TaskList,{tasks:[a,b]}));const original=screen.getByRole('article',{name:'Build'});view.rerender(React.createElement(TaskList,{tasks:[b,a]}));expect(screen.getByRole('article',{name:'Build'})===original).toBe(true);});`,
    hints: [
      "Map over tasks to return components. React needs a stable key for each one.",
      "Return early for empty input. Otherwise map each task to TaskCard with key={task.id}.",
      "return <section>{tasks.map(task => <TaskCard key={task.___} task={task} />)}</section>;",
    ],
    notes: [
      "Stable keys preserve a component’s identity across reordering. Array indexes identify positions, not tasks.",
      "An early empty-state return keeps the normal rendering path small and easy to read.",
    ],
  }),
  seed({
    id: "TF-034",
    sprint: 4,
    title: "Make room for the next idea",
    story:
      "As a user, I want a controlled add-task form so that I can capture a task without leaving the page.",
    acceptance: [
      'Export AddTaskForm({ onAdd }). Provide an input labeled "Task title" and an "Add task" submit button.',
      "Keep the input in React state. Submit a trimmed string to onAdd and clear the input.",
      "Prevent browser navigation. Do not submit blank titles.",
    ],
    concepts: ["Controlled forms", "useState", "Validation"],
    runtime: "react",
    difficulty: 2,
    starter:
      'import React, { useState } from "react";\n\nexport function AddTaskForm({ onAdd }) {\n  return <form>Build your form here.</form>;\n}\n',
    solution: `import React, { useState } from "react";
export function AddTaskForm({ onAdd }) {
  const [title, setTitle] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle("");
  }
  return <form onSubmit={submit}>
    <label>Task title<input value={title} onChange={event => setTitle(event.target.value)} /></label>
    <button type="submit">Add task</button>
  </form>;
}
`,
    tests: `const {AddTaskForm}=subject;
test('Provides an accessible input and submit button',()=>{render(React.createElement(AddTaskForm,{onAdd:()=>{}}));expect(screen.getByRole('textbox',{name:'Task title'})).toBeTruthy();expect(screen.getByRole('button',{name:'Add task'})).toBeTruthy();});
test('Submits trimmed input and clears the form',()=>{const values=[];render(React.createElement(AddTaskForm,{onAdd:v=>values.push(v)}));const input=screen.getByRole('textbox');fireEvent.change(input,{target:{value:' Ship it '}});fireEvent.click(screen.getByRole('button'));expect(values).toEqual(['Ship it']);expect(input.value).toBe('');});
test('Rejects whitespace-only submissions',()=>{let n=0;render(React.createElement(AddTaskForm,{onAdd:()=>n++}));fireEvent.change(screen.getByRole('textbox'),{target:{value:'   '}});fireEvent.click(screen.getByRole('button'));expect(n).toBe(0);});`,
    hints: [
      "Bind value and onChange to state. Handle submission on the form, not the button.",
      "Prevent default, guard against blank text, call onAdd with trimmed text, then reset state.",
      'event.preventDefault();\nif (!title.trim()) return;\nonAdd(title.___());\nsetTitle("");',
    ],
    notes: [
      "A form-level submit handler also works when the user presses Enter in the input.",
      "Normalize at the boundary so every caller receives the same clean value.",
    ],
  }),
];
const card =
  'import React from "react";\nexport function TaskCard({task}) {\n  return <article aria-label={task.title}><h2>{task.title}</h2></article>;\n}\n';
react[2].starterFiles["src/TaskCard.jsx"] = card;
react[2].solutionFiles["src/TaskCard.jsx"] = card;

function future(
  sprint: number,
  index: number,
  title: string,
  concepts: string[],
): Ticket {
  return {
    id: `TF-${String((sprint - 1) * 10 + index).padStart(3, "0")}`,
    sprintId: `s${sprint}`,
    title,
    userStory: `As a Taskflow user, I want ${title.toLowerCase()} so that my workspace is reliable and ready to grow.`,
    acceptance: [],
    starterFiles: {},
    solutionFiles: {},
    tests: "",
    hints: ["", "", ""],
    review: [],
    xp: 150,
    concepts,
    difficulty: 3,
    comingSoon: true,
  };
}
function futureBoss(
  sprint: number,
  title: string,
  concepts: string[],
): BossTicket {
  return {
    ...future(sprint, 10, title, concepts),
    xp: 400,
    difficulty: 5,
    rubric: [
      { id: "behavior", label: "All acceptance tests pass", check: "auto" },
      {
        id: "review",
        label: "Architecture and deployment review",
        check: "self",
      },
    ],
  };
}
export const sprints: Sprint[] = [
  {
    id: "s1",
    title: "JavaScript fundamentals",
    goal: "Build the engine behind Taskflow. One pure function at a time.",
    tickets: core,
    boss: coreBoss,
  },
  {
    id: "s2",
    title: "DOM & async",
    goal: "Bring the core to life with a responsive, resilient vanilla UI.",
    tickets: [
      ...dom,
      future(2, 7, "Load projects in parallel", ["Promise.all"]),
      future(2, 8, "Retry with backoff", ["Promises", "Retry"]),
      future(2, 9, "Cancel stale requests", ["AbortController"]),
    ],
    boss: futureBoss(2, "Boss: an optimistic task page", [
      "Optimistic updates",
      "Rollback",
    ]),
  },
  {
    id: "s3",
    title: "TypeScript",
    goal: "Make impossible states impossible. Give your core a type system.",
    tickets: [
      future(3, 1, "Give every task a type", ["TypeScript", "Interfaces"]),
      future(3, 2, "Model task status", ["Discriminated unions"]),
      future(3, 3, "Paginate anything", ["Generics"]),
      future(3, 4, "Patch tasks safely", ["Partial", "Pick"]),
      future(3, 5, "Index projects by ID", ["Record"]),
      future(3, 6, "Narrow unknown input", ["Type guards", "unknown"]),
      future(3, 7, "Validate API responses", ["Zod", "Runtime validation"]),
      future(3, 8, "Prove the types", ["expectTypeOf", "No any"]),
      future(3, 9, "Type the full core library", ["TypeScript", "Composition"]),
    ],
    boss: futureBoss(3, "Boss: a typed event emitter", [
      "Generics",
      "Event maps",
    ]),
  },
  {
    id: "s4",
    title: "React",
    goal: "Build a component-driven workspace that feels like a real product.",
    tickets: [
      ...react,
      future(4, 5, "Fetch tasks with effects", ["useEffect", "Cleanup"]),
      future(4, 6, "Extract useTasks and useDebounce", ["Custom hooks"]),
      future(4, 7, "Coordinate complex state", ["useReducer"]),
      future(4, 8, "Share auth and theme", ["Context"]),
      future(4, 9, "Measure, memoize, and recover", [
        "useMemo",
        "React.memo",
        "Error boundaries",
      ]),
    ],
    boss: futureBoss(4, "Boss: the Taskflow SPA", [
      "React Router",
      "Integration tests",
    ]),
  },
  {
    id: "s5",
    title: "Node, Express & REST",
    goal: "Give Taskflow an API with predictable behavior and useful errors.",
    tickets: [
      future(5, 1, "Answer an HTTP request", ["HTTP", "Node"]),
      future(5, 2, "Route tasks and projects", ["Express", "Routing"]),
      future(5, 3, "Parse and validate JSON", ["Middleware", "Validation"]),
      future(5, 4, "Return consistent errors", ["Error handling", "REST"]),
      future(5, 5, "Create and update tasks", ["Status codes", "CRUD"]),
      future(5, 6, "Filter and paginate responses", ["Query params"]),
      future(5, 7, "Isolate the repository", [
        "Repositories",
        "Dependency injection",
      ]),
      future(5, 8, "Persist with SQLite", ["SQLite", "Run locally"]),
      future(5, 9, "Configure and observe the API", ["Environment", "Logging"]),
    ],
    boss: futureBoss(5, "Boss: a complete CRUD API", ["REST", "Coverage"]),
  },
  {
    id: "s6",
    title: "Test, secure & ship",
    goal: "Earn trust, protect user data, and take your product to production.",
    tickets: [
      future(6, 1, "Test at the right layer", [
        "Unit tests",
        "Integration tests",
        "E2E",
      ]),
      future(6, 2, "Mock the boundaries", ["Mocking"]),
      future(6, 3, "Register and hash passwords", ["Password hashing"]),
      future(6, 4, "Sign and verify sessions", ["JWT", "Authentication"]),
      future(6, 5, "Protect every route", [
        "Authorization",
        "Protected routes",
      ]),
      future(6, 6, "Harden the API", ["CORS", "Rate limiting", "Sanitization"]),
      future(6, 7, "Build the React auth flow", ["Auth flow", "Context"]),
      future(6, 8, "Make CI your safety net", ["GitHub Actions", "CI"]),
      future(6, 9, "Package and deploy", ["Docker", "Deployment"]),
    ],
    boss: futureBoss(6, "Boss: ship Taskflow", [
      "Full stack",
      "Runbook",
      "Production",
    ]),
  },
];
export const allTickets = [
  ...sprints.flatMap((s) => [...s.tickets, s.boss]),
  ...engineeringTickets,
];
export const seededTickets = allTickets.filter((t) => !t.comingSoon);
export const ticketById = Object.fromEntries(allTickets.map((t) => [t.id, t]));
export const isBoss = (ticket: Ticket): ticket is BossTicket =>
  "rubric" in ticket;
