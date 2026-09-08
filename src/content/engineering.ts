import type { Ticket } from "../types";

type Lab = Omit<
  Ticket,
  | "sprintId"
  | "runtime"
  | "track"
  | "testNames"
  | "review"
  | "starterFiles"
  | "solutionFiles"
  | "xp"
> & {
  starter: string;
  solution: string;
  notes: [string, string];
};
function lab({ starter, solution, notes, ...data }: Lab): Ticket {
  const file = "src/engineering.js";
  return {
    ...data,
    sprintId: "s1",
    runtime: "worker",
    track: "engineering",
    xp: 150,
    starterFiles: { [file]: starter },
    solutionFiles: { [file]: solution },
    testNames: [...data.tests.matchAll(/test\('([^']+)'/g)].map((m) => m[1]),
    review: notes.map((text, i) => ({ file, line: i + 2, text })),
  };
}
export const engineeringTickets: Ticket[] = [
  lab({
    id: "ENG-001",
    title: "Debug the edit that changes two screens",
    difficulty: 2,
    prerequisites: ["TF-001", "TF-002"],
    concepts: ["Debugging", "Aliasing", "Immutability"],
    userStory:
      "As a user, I want renaming a task to leave the previous task list unchanged so that cancelling an edit does not silently change another screen.",
    acceptance: [
      "Fix renameTask(tasks, id, title). Return a fresh list and a new object only for the matching task.",
      "Trim the title. Reject non-string or blank titles, and reject an unknown ID, before changing any input.",
      "Preserve other task fields and the identity of unchanged rows. IDs are unique. Add a comment naming the original bug.",
    ],
    starter: `export function renameTask(tasks, id, title) {
  const copy = [...tasks];
  const task = copy.find(task => task.id === id);
  task.title = title.trim();
  return copy;
}
`,
    solution: `export function renameTask(tasks, id, title) {
  // Copying an array still aliases its task objects.
  if (typeof title !== 'string' || !title.trim()) throw new Error('Title required');
  if (!tasks.some(task => task.id === id)) throw new Error('Unknown task');
  return tasks.map(task => task.id === id ? { ...task, title: title.trim() } : task);
}
`,
    tests: `const {renameTask}=subject;
test('Renames and trims without losing fields',()=>{expect(renameTask([{id:'a',title:'Old',done:true}],'a',' New ')[0]).toEqual({id:'a',title:'New',done:true});});
test('Does not modify frozen input objects',()=>{const task=Object.freeze({id:'a',title:'Old'});const rows=Object.freeze([task]);expect(renameTask(rows,'a','New')[0].title).toBe('New');expect(task.title).toBe('Old');});
test('Preserves identity for unchanged rows',()=>{const a={id:'a',title:'A'},b={id:'b',title:'B'};const rows=[a,b], result=renameTask(rows,'a','New');expect(result===rows).toBe(false);expect(result[0]===a).toBe(false);expect(result[1]===b).toBe(true);});
test('Rejects bad titles and unknown IDs without mutation',()=>{const rows=[{id:'a',title:'Old'}];for(const title of ['', ' ', null, 7]) expect(()=>renameTask(rows,'a',title)).toThrow();expect(()=>renameTask(rows,'missing','New')).toThrow();expect(rows).toEqual([{id:'a',title:'Old'}]);});`,
    hints: [
      "A copied array can still point at the original objects. Reproduce the bug with Object.freeze.",
      "Validate first. Map the list, copying the matched row and returning every other row unchanged.",
      "return tasks.map(task => task.id === id ? { ...task, title: title.trim() } : ___);",
    ],
    notes: [
      "The bug is aliasing, not a missing array copy. Copy the object at the boundary where it changes.",
      "Reference stability for unchanged rows makes downstream work predictable. Cloning every object hides the original bug at an unnecessary cost.",
    ],
  }),
  lab({
    id: "ENG-002",
    title: "Write tests that catch believable bugs",
    difficulty: 2,
    prerequisites: ["TF-002", "ENG-001"],
    concepts: ["Regression tests", "Mutation testing", "Contracts"],
    userStory:
      "As a maintainer, I want a regression suite for toggleDone so that a plausible but broken refactor cannot ship.",
    acceptance: [
      "Implement verifyToggle(candidate). It must return normally for any correct toggle implementation and throw an Error when a checked behavior is wrong.",
      "The contract: return a new object, invert both true and false, preserve all other fields, and never modify the input.",
      "Call candidate with your own examples and write assertions using if/throw. Your suite is tested against correct implementations and four faulty variants. Do not inspect function source.",
    ],
    starter: `export function verifyToggle(candidate) {
  const result = candidate({ id: 'a', done: false });
  if (result.done !== true) throw new Error('Expected completion');
}
`,
    solution: `export function verifyToggle(candidate) {
  for (const done of [false, true]) {
    const original = { id: 'a', title: 'Keep this', done };
    const result = candidate(original);
    if (result === original) throw new Error('Must return a new object');
    if (result.done !== !done) throw new Error('Must invert completion');
    if (result.id !== 'a' || result.title !== 'Keep this') throw new Error('Must preserve fields');
    if (original.done !== done || original.title !== 'Keep this') throw new Error('Must preserve input');
  }
}
`,
    tests: `const {verifyToggle}=subject;
test('Accepts two correct implementations',()=>{verifyToggle(task=>({...task,done:!task.done}));verifyToggle(task=>Object.assign({},task,{done:!task.done}));});
test('Detects an implementation that only completes',()=>expect(()=>verifyToggle(task=>({...task,done:true}))).toThrow());
test('Detects mutation even when a copy is returned',()=>expect(()=>verifyToggle(task=>{task.done=!task.done;return {...task};})).toThrow());
test('Detects a lost field',()=>expect(()=>verifyToggle(task=>({done:!task.done}))).toThrow());
test('Detects unchanged completion',()=>expect(()=>verifyToggle(task=>({...task}))).toThrow());`,
    hints: [
      "Test both directions. A true result alone does not prove a toggle.",
      "Store the original completion state, call candidate, then compare the result and the original against the contract.",
      "if (result === original || result.done !== !done || original.done !== ___) throw new Error('Contract broken');",
    ],
    notes: [
      "A useful regression test distinguishes a realistic bug from correct behavior. Passing a correct candidate prevents an always-throw suite from earning credit.",
      "Assertions about observable behavior survive refactors. Assertions about a particular method or function source often do not.",
    ],
  }),
  lab({
    id: "ENG-003",
    title: "Retry without amplifying a failure",
    difficulty: 3,
    prerequisites: ["TF-014"],
    concepts: ["Retry", "Backoff", "Dependency injection", "Failure handling"],
    userStory:
      "As a user, I want a transient task-load failure retried within a fixed budget so that temporary faults recover without endless requests.",
    acceptance: [
      "Implement async retryRead(operation, { attempts, baseDelay, sleep }). attempts is the total call budget, including the first call.",
      "Retry only errors with retryable === true. Rethrow the final or permanent error unchanged.",
      "Before retry number 1, 2, 3, wait baseDelay, baseDelay*2, baseDelay*4 via the injected async sleep. Never wait after the final failure or a success.",
      "Reject non-integer attempts < 1 and non-finite or negative baseDelay before calling operation. This exercise is for an idempotent read.",
    ],
    starter: `export async function retryRead(operation, { attempts, baseDelay, sleep }) {
  return operation();
}
`,
    solution: `export async function retryRead(operation, { attempts, baseDelay, sleep }) {
  if (!Number.isInteger(attempts) || attempts < 1 || !Number.isFinite(baseDelay) || baseDelay < 0) throw new Error('Invalid retry budget');
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (error?.retryable !== true || attempt === attempts - 1) throw error;
      await sleep(baseDelay * 2 ** attempt);
    }
  }
}
`,
    tests: `const {retryRead}=subject;const transient=()=>Object.assign(new Error('Unavailable'),{retryable:true});
test('Returns immediately on success',async()=>{const waits=[];expect(await retryRead(async()=>42,{attempts:3,baseDelay:10,sleep:async n=>waits.push(n)})).toBe(42);expect(waits).toEqual([]);});
test('Uses exponential waits within the total call budget',async()=>{let calls=0;const waits=[];const value=await retryRead(async()=>{if(++calls<4)throw transient();return 'ready';},{attempts:4,baseDelay:5,sleep:async n=>waits.push(n)});expect(value).toBe('ready');expect(calls).toBe(4);expect(waits).toEqual([5,10,20]);});
test('Stops on a permanent error and preserves its identity',async()=>{for(const marker of [undefined,false,'yes']){const failure=Object.assign(new Error('Forbidden'),{retryable:marker});let calls=0,caught;try{await retryRead(async()=>{calls++;throw failure;},{attempts:4,baseDelay:1,sleep:async()=>{throw new Error('Must not wait');}});}catch(e){caught=e;}expect(caught===failure).toBe(true);expect(calls).toBe(1);}});
test('Rethrows the final failure without a final wait',async()=>{const failure=transient(),waits=[];let calls=0,caught;try{await retryRead(()=>{calls++;throw failure;},{attempts:2,baseDelay:0,sleep:async n=>waits.push(n)});}catch(e){caught=e;}expect(calls).toBe(2);expect(waits).toEqual([0]);expect(caught===failure).toBe(true);});
test('Validates configuration before doing work',async()=>{let calls=0;for(const [attempts,baseDelay] of [[0,1],[1.5,1],[1,-1],[1,Infinity]])await expect(()=>retryRead(async()=>calls++,{attempts,baseDelay,sleep:async()=>{}})).toReject();expect(calls).toBe(0);});`,
    hints: [
      "Write down the total calls and waits for attempts=3 before coding. There should be only two waits.",
      "Validate, then loop over attempt indexes. Catch failures, decide whether another call is allowed, and only then sleep.",
      "if (error?.retryable !== true || attempt === attempts - 1) throw error;\nawait sleep(baseDelay * 2 ** ___);",
    ],
    notes: [
      "Retry policy is a contract: which failures, how many calls, and how much delay. Injecting sleep makes the contract deterministic to test.",
      "Real deployments also need a total deadline, jitter, and cancellation. Retrying a write requires a separate duplicate-prevention design.",
    ],
  }),
  lab({
    id: "ENG-004",
    title: "Keep an old response out of a new search",
    difficulty: 3,
    prerequisites: ["TF-013", "TF-014"],
    concepts: ["Race conditions", "Promises", "Cleanup"],
    userStory:
      "As a user, I want only my latest search to update the page so that a slow response cannot replace newer results.",
    acceptance: [
      "Export createSearch(load, publish). Return { search(query), dispose() }. load is an injected async function; publish receives { data } or { error }.",
      "Only the most recently started search may publish its success or failure. search resolves after handling its load result, including failures.",
      "dispose is permanent: pending responses must not publish, and later searches must not call load. Separate controller instances must not interfere.",
    ],
    starter: `export function createSearch(load, publish) {
  return {
    async search(query) { publish({ data: await load(query) }); },
    dispose() {},
  };
}
`,
    solution: `export function createSearch(load, publish) {
  let generation = 0, disposed = false;
  return {
    async search(query) {
      if (disposed) return;
      const mine = ++generation;
      let result;
      try { result = { data: await load(query) }; }
      catch (error) { result = { error }; }
      if (!disposed && mine === generation) publish(result);
    },
    dispose() { disposed = true; generation++; },
  };
}
`,
    tests: `const {createSearch}=subject;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
test('Publishes the newest result despite reversed completion',async()=>{const old=deferred(),fresh=deferred(),events=[];const c=createSearch(q=>q==='old'?old.promise:fresh.promise,e=>events.push(e));const a=c.search('old'),b=c.search('new');fresh.resolve(['new']);await b;old.resolve(['old']);await a;expect(events).toEqual([{data:['new']}]);});
test('Ignores stale errors and publishes current failures',async()=>{const old=deferred(),fresh=deferred(),events=[];const c=createSearch(q=>q==='old'?old.promise:fresh.promise,e=>events.push(e));const a=c.search('old'),b=c.search('new');const failure=new Error('Offline');old.reject(new Error('Stale'));await a;fresh.reject(failure);await b;expect(events.length).toBe(1);expect(events[0].error===failure).toBe(true);});
test('Disposal suppresses pending work and future loads',async()=>{const pending=deferred(),events=[];let calls=0;const c=createSearch(()=>{calls++;return pending.promise;},e=>events.push(e));const work=c.search('a');c.dispose();pending.resolve('late');await work;await c.search('b');expect(events).toEqual([]);expect(calls).toBe(1);});
test('Controllers keep independent generations',async()=>{const pending=deferred(),a=[],b=[];const one=createSearch(()=>pending.promise,e=>a.push(e)),two=createSearch(async()=>2,e=>b.push(e));const work=one.search('a');await two.search('b');pending.resolve(1);await work;expect(a).toEqual([{data:1}]);expect(b).toEqual([{data:2}]);});`,
    hints: [
      "Completion order is not request order. Give each started request a generation number.",
      "Capture the current generation before await. After either success or failure, publish only if that generation is still current and the controller is live.",
      "const mine = ++generation;\n// await load and handle failures\nif (!disposed && mine === ___) publish(result);",
    ],
    notes: [
      "The invariant applies to both success and failure. A stale error can overwrite a healthy page just as easily as stale data.",
      "Ignoring a response protects correctness. Aborting the transport can additionally save resources, but does not replace a clear ownership rule.",
    ],
  }),
  lab({
    id: "ENG-005",
    title: "Make a repeated command safe",
    difficulty: 4,
    prerequisites: ["TF-005", "ENG-003"],
    concepts: ["Idempotency", "Data integrity", "Repositories"],
    userStory:
      "As a user on an unreliable connection, I want retrying the same create command to return the same task so that a lost response does not create duplicates.",
    acceptance: [
      "Export createRepository(makeId), returning { create({ key, title }) }. The repository is synchronous and in-memory for this lab.",
      "Require nonempty string key and title. Trim title; treat key as an exact opaque string. First use creates { id: makeId(), title: trimmedTitle }.",
      "Same key and normalized title returns an equal task without calling makeId again. Same key and different title throws an Error with message containing conflict.",
      "Different keys create independent tasks. Mutating any returned task must not change stored data. Failed validation or makeId must not reserve the key.",
    ],
    starter: `export function createRepository(makeId) {
  return { create({ key, title }) { return { id: makeId(), title }; } };
}
`,
    solution: `export function createRepository(makeId) {
  const commands = new Map();
  return {
    create({ key, title }) {
      if (typeof key !== 'string' || !key.trim() || typeof title !== 'string' || !title.trim()) throw new Error('Invalid command');
      const normalized = title.trim();
      if (commands.has(key)) {
        const existing = commands.get(key);
        if (existing.title !== normalized) throw new Error('Idempotency conflict');
        return { ...existing };
      }
      const task = { id: makeId(), title: normalized };
      commands.set(key, task);
      return { ...task };
    },
  };
}
`,
    tests: `const {createRepository}=subject;
test('Replays the same normalized command once',()=>{let calls=0;const repo=createRepository(()=>++calls);expect(repo.create({key:'request',title:' Build '})).toEqual({id:1,title:'Build'});expect(repo.create({key:'request',title:'Build'})).toEqual({id:1,title:'Build'});expect(calls).toBe(1);});
test('Rejects conflicting reuse without replacing the original',()=>{const repo=createRepository(()=>1);repo.create({key:'k',title:'A'});expect(()=>repo.create({key:'k',title:'B'})).toThrow('conflict');expect(repo.create({key:'k',title:'A'}).title).toBe('A');});
test('Handles independent and reserved-looking keys',()=>{let calls=0;const repo=createRepository(()=>++calls);repo.create({key:'__proto__',title:'A'});repo.create({key:' k',title:'A'});repo.create({key:'k',title:'A'});expect(calls).toBe(3);});
test('Does not expose mutable stored task objects',()=>{const repo=createRepository(()=>1);const first=repo.create({key:'k',title:'A'});first.title='Changed';const replay=repo.create({key:'k',title:'A'});expect(replay.title).toBe('A');replay.title='Also changed';expect(repo.create({key:'k',title:'A'}).title).toBe('A');});
test('Failures do not consume the key',()=>{let calls=0;const repo=createRepository(()=>{if(++calls===1)throw new Error('Storage unavailable');return calls;});expect(()=>repo.create({key:'k',title:' '})).toThrow();expect(calls).toBe(0);expect(()=>repo.create({key:'k',title:'A'})).toThrow();expect(repo.create({key:'k',title:'A'})).toEqual({id:2,title:'A'});for(const key of ['',null,2])expect(()=>repo.create({key,title:'A'})).toThrow();});`,
    hints: [
      "Store the result by command key, together with the normalized payload you need for conflict detection.",
      "Validate first, check for an existing command, and only then create and store. Return a copy on both paths.",
      "if (commands.has(key)) {\n  const old = commands.get(key);\n  if (old.title !== normalized) throw new Error('conflict');\n  return { ...___ };\n}",
    ],
    notes: [
      "Idempotency keys identify commands, not just tasks. Reusing a key with different intent must be detected instead of silently accepted.",
      "A Map only models single-process behavior. A real service needs atomic uniqueness, durable storage, key scoping, and a retention policy before this guarantee survives concurrency or restarts.",
    ],
  }),
  lab({
    id: "ENG-006",
    title: "Put a ceiling on parallel work",
    difficulty: 4,
    prerequisites: ["ENG-003", "ENG-004"],
    concepts: ["Concurrency", "Backpressure", "Ordering"],
    userStory:
      "As an operator, I want bulk task enrichment to use bounded concurrency so that a large list does not overwhelm a downstream service.",
    acceptance: [
      "Export async mapLimit(items, limit, job). Call job(item, index) at most limit times concurrently and resolve results in original input order.",
      "When possible, start limit jobs without waiting for the first one. Start another when a slot becomes free. Do not mutate items.",
      "Reject non-integer limits below 1 before starting any work. Empty input resolves to an empty array.",
      "If a job fails, stop assigning new jobs once that failure is observed, await already-running jobs, then reject with the first observed error. This contract does not cancel in-flight work.",
    ],
    starter: `export async function mapLimit(items, limit, job) {
  return Promise.all(items.map(job));
}
`,
    solution: `export async function mapLimit(items, limit, job) {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid concurrency limit');
  const results = new Array(items.length);
  let next = 0, failed = false, failure;
  async function worker() {
    while (!failed && next < items.length) {
      const index = next++;
      try { results[index] = await job(items[index], index); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (failed) throw failure;
  return results;
}
`,
    tests: `const {mapLimit}=subject;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
test('Bounds parallel work and fills a free slot',async()=>{const gates=[deferred(),deferred(),deferred()],started=[];const done=mapLimit(['a','b','c'],2,(value,index)=>{started.push(index);return gates[index].promise;});await Promise.resolve();expect(started).toEqual([0,1]);gates[1].resolve('B');await Promise.resolve();await Promise.resolve();expect(started).toEqual([0,1,2]);gates[2].resolve('C');gates[0].resolve('A');expect(await done).toEqual(['A','B','C']);});
test('Passes values and indexes without changing input',async()=>{const rows=Object.freeze([3,2,1]);expect(await mapLimit(rows,2,async(value,index)=>value+index)).toEqual([3,3,3]);expect(rows).toEqual([3,2,1]);});
test('Handles empty input and rejects invalid limits before work',async()=>{let calls=0;expect(await mapLimit([],3,async()=>calls++)).toEqual([]);for(const limit of [0,-1,1.5,Infinity])await expect(()=>mapLimit([1],limit,async()=>calls++)).toReject();expect(calls).toBe(0);});
test('Stops scheduling after a failure and settles active work',async()=>{const a=deferred(),b=deferred(),failure=new Error('Downstream failed'),started=[];let settled=false;const result=mapLimit([0,1,2,3],2,(_,i)=>{started.push(i);return i===0?a.promise:b.promise;}).then(()=>({ok:true}),error=>({error}));result.then(()=>{settled=true;});a.reject(failure);await Promise.resolve();await Promise.resolve();expect(started).toEqual([0,1]);expect(settled).toBe(false);b.resolve('finished');const outcome=await result;expect(outcome.error===failure).toBe(true);expect(started).toEqual([0,1]);});
test('Propagates falsy rejection reasons',async()=>{let rejected=false;try{await mapLimit([1],1,()=>Promise.reject(null));}catch(error){rejected=true;expect(error).toBe(null);}expect(rejected).toBe(true);});`,
    hints: [
      "Promise.all over every item starts all jobs. Instead create only limit worker loops sharing the next index.",
      "Each worker reserves an index synchronously, awaits that job, then takes another. Save results by index. Record failure separately from its possibly falsy value.",
      "while (!failed && next < items.length) {\n  const index = next++;\n  try { results[index] = await job(items[index], index); }\n  catch (error) { if (!failed) { failed = true; failure = ___; } }\n}",
    ],
    notes: [
      "A concurrency limit controls in-flight pressure; it is not a requests-per-second rate limit. Keep those requirements separate.",
      "Failure semantics belong in the contract. Here we stop scheduling and wait for active work; immediate rejection or cancellation would be different, defensible policies.",
    ],
  }),
];
