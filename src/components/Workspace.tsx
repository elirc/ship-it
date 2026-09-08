import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock3,
  Code2,
  FileCode2,
  GitCompareArrows,
  Lightbulb,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Trophy,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { isBoss, sprints, ticketById } from "../content/curriculum";
import { useStore } from "../store";
import { engineeringTickets } from "../content/engineering";
import { runTicket } from "../runner/client";
import type { RunResult } from "../types";
import { Modal } from "./Modal";
import CodeEditor from "./EditorSurface";
import { LearningNotes } from "./LearningNotes";
export function Workspace({ notify }: { notify: (message: string) => void }) {
  const store = useStore(),
    ticket = ticketById[store.selectedTicket],
    progress = store.progress[ticket.id],
    recall = store.learning[ticket.id]?.recall,
    recalling = recall?.active ?? false,
    engineering = ticket.track === "engineering";
  const files = recalling
    ? recall!.files
    : (store.code[ticket.id] ?? ticket.starterFiles);
  const [path, setPath] = useState(Object.keys(files)[0]),
    [mobile, setMobile] = useState("ticket"),
    [panel, setPanel] = useState("brief"),
    [outputTab, setOutputTab] = useState("tests");
  const [diff, setDiff] = useState(false),
    [review, setReview] = useState(false),
    [showReference, setShowReference] = useState(false),
    [reset, setReset] = useState(false),
    [running, setRunning] = useState(false),
    [result, setResult] = useState<RunResult | null>(null),
    [celebrate, setCelebrate] = useState(false),
    [formatting, setFormatting] = useState(false);
  const activeRun = useRef<ReturnType<typeof runTicket>>(),
    formatter = useRef<Worker>(),
    generation = useRef(0),
    celebrationTimer = useRef<ReturnType<typeof setTimeout>>();
  const runRef = useRef<() => void>(() => {}),
    saveRef = useRef<() => void>(() => {});
  useEffect(() => {
    generation.current++;
    activeRun.current?.cancel();
    formatter.current?.terminate();
    setPath(Object.keys(ticket.starterFiles)[0]);
    setResult(null);
    setRunning(false);
    setFormatting(false);
    setDiff(false);
    setReview(false);
    setShowReference(false);
    setPanel("brief");
    setMobile("ticket");
    setCelebrate(false);
    clearTimeout(celebrationTimer.current);
    return () => {
      generation.current++;
      activeRun.current?.cancel();
      formatter.current?.terminate();
      clearTimeout(celebrationTimer.current);
    };
  }, [ticket.id, recalling]);
  const currentPath = Object.hasOwn(files, path) ? path : Object.keys(files)[0];
  async function run() {
    if (running) return;
    const current = generation.current;
    setRunning(true);
    setOutputTab("tests");
    setMobile("results");
    const snapshot = { ...files };
    activeRun.current = runTicket(ticket, snapshot);
    const response = await activeRun.current.promise;
    if (current !== generation.current) return;
    setResult(response);
    setRunning(false);
    const reward = store.recordRun(ticket.id, response, snapshot);
    if (recalling) {
      if (reward.passed) {
        const saved = useStore.getState().learning[ticket.id].recall!;
        notify(
          saved.spaced
            ? "Recall verified. Your next revisit is scheduled."
            : "Practice passed. Early or assisted practice does not advance the recall schedule.",
        );
      }
      return;
    }
    if (reward.passed) {
      setShowReference(false);
      setReview(true);
      if (reward.firstPass) {
        setCelebrate(true);
        celebrationTimer.current = setTimeout(() => setCelebrate(false), 3500);
      }
      notify(
        `${reward.firstPass ? "Ticket shipped" : "All tests green"}${reward.xp > 0 ? ` · +${reward.xp} XP` : ""}${reward.badges.length ? ` · ${reward.badges.length} badge unlocked` : ""}`,
      );
    } else if (reward.xp > 0)
      notify(`Progress counts. +${reward.xp} XP earned.`);
  }
  function format() {
    if (formatting) return;
    setFormatting(true);
    const current = generation.current,
      snapshot = files[currentPath];
    const worker = new Worker(
      new URL("../runner/format.worker.ts", import.meta.url),
      { type: "module" },
    );
    formatter.current = worker;
    const timeout = setTimeout(() => {
      worker.terminate();
      if (current === generation.current) {
        setFormatting(false);
        notify("Formatting took too long. Your code is saved.");
      }
    }, 15000);
    worker.onmessage = (e: MessageEvent<{ code?: string; error?: string }>) => {
      clearTimeout(timeout);
      worker.terminate();
      if (current !== generation.current) return;
      setFormatting(false);
      if (e.data.error)
        notify("Fix the syntax error before formatting. Your code is saved.");
      else if (e.data.code !== undefined) {
        const latestState = useStore.getState();
        const latest =
          (recalling
            ? latestState.learning[ticket.id]?.recall?.files[currentPath]
            : latestState.code[ticket.id]?.[currentPath]) ??
          ticket.starterFiles[currentPath];
        if (latest === snapshot) {
          store.saveCode(ticket.id, currentPath, e.data.code);
          notify("Formatted and saved.");
        } else notify("New edits saved. Format again to include them.");
      }
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      setFormatting(false);
      notify("Could not format. Your edits are saved.");
    };
    worker.postMessage({ code: snapshot, path: currentPath });
  }
  runRef.current = run;
  saveRef.current = format;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const completed = result?.results.filter((r) => r.passed).length ?? 0,
    total = ticket.testNames?.length ?? 0;
  const sprint = sprints.find((s) => s.id === ticket.sprintId)!,
    sequence = engineering
      ? engineeringTickets
      : [...sprint.tickets, sprint.boss],
    index = sequence.findIndex((t) => t.id === ticket.id),
    next =
      sequence[index + 1] ??
      (engineering
        ? undefined
        : sprints[sprints.indexOf(sprint) + 1]?.tickets[0]);
  return (
    <>
      <div className="workspace-heading">
        <div className="workspace-heading-copy">
          <div className="eyebrow">
            <span className="live-dot" /> YOUR NEXT SHIP{" "}
            <span className="muted">/</span>{" "}
            {recalling
              ? "FRESH-CODE RECALL"
              : engineering
                ? "ENGINEERING LAB"
                : ticket.sprintId === "s4"
                  ? "REACT PREVIEW"
                  : `SPRINT ${ticket.sprintId.slice(1)}`}
          </div>
          <h1>
            Build skill. <span>Own the outcome.</span>
          </h1>
          <p>Predict a failure. Build and verify. Explain your decision.</p>
        </div>
        <div className="sprint-summary">
          <div>
            <span>{engineering ? "Lab progress" : "Sprint progress"}</span>
            <strong>
              {
                sequence.filter((t) => store.progress[t.id].status === "passed")
                  .length
              }
              <span> / {sequence.length} passed</span>
            </strong>
          </div>
          <div className="segmented-progress">
            {sequence.map((t) => (
              <i
                key={t.id}
                className={
                  store.progress[t.id].status === "passed"
                    ? "complete"
                    : t.id === ticket.id
                      ? "current"
                      : ""
                }
              />
            ))}
          </div>
          <small>
            <Trophy size={12} /> Passing tests is the start of a review
          </small>
        </div>
      </div>
      <div className="workspace-toolbar">
        <div className="workspace-tabs">
          <button className="active">
            <Code2 size={15} /> Workspace
          </button>
          <button onClick={() => store.setView("growth")}>
            Your growth plan <ArrowRight size={13} />
          </button>
        </div>
        <div className="autosave">
          <span className="live-dot" /> All changes saved locally
        </div>
      </div>
      {recalling && (
        <div className="recall-banner" role="status">
          <div>
            <strong>
              {recall?.passed ? "Recall attempt passed" : "Rebuild from memory"}
            </strong>
            <p>
              Your saved draft and passing code are safe. Hints and previous
              explanations stay closed during this attempt.{" "}
              {recall?.passed &&
                (recall.spaced
                  ? "Spaced recall recorded."
                  : "Early practice does not advance the schedule.")}
            </p>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              store.endRecall(ticket.id);
              notify(
                "Returned to your working draft. Open code review when you need help.",
              );
            }}
          >
            End recall
          </button>
        </div>
      )}
      <div className="mobile-tabs" role="tablist" aria-label="Workspace panel">
        {["ticket", "editor", "results"].map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobile === tab}
            onClick={() => setMobile(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="workspace-grid">
        <section
          className={`ticket-panel workspace-panel ${mobile === "ticket" ? "mobile-active" : ""}`}
          aria-label="Ticket brief"
        >
          <div className="panel-bar">
            <div className="small-tabs">
              <button
                className={panel === "brief" ? "active" : ""}
                onClick={() => setPanel("brief")}
              >
                The ticket
              </button>
              <button
                className={panel === "review" ? "active" : ""}
                disabled={progress.status !== "passed" || recalling}
                onClick={() => {
                  setPanel("review");
                  setShowReference(false);
                  setReview(true);
                }}
              >
                Code review{" "}
                {progress.status !== "passed" && (
                  <span className="tiny-lock">↗</span>
                )}
              </button>
            </div>
            <span className="ticket-position">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(sequence.length).padStart(2, "0")}
            </span>
          </div>
          <div className="ticket-scroll">
            <div className="ticket-meta">
              <span className="ticket-id">{ticket.id}</span>
              <span
                className={`status-pill ${progress.status === "passed" ? "passed" : ""}`}
              >
                <Circle size={9} />
                {recalling
                  ? "Recall practice"
                  : progress.status === "passed"
                    ? "Tests passed"
                    : "In progress"}
              </span>
            </div>
            <h2>{ticket.title}</h2>
            <div className="ticket-stats">
              <span className="difficulty">
                {[1, 2, 3, 4, 5].map((n) => (
                  <i
                    key={n}
                    className={n <= ticket.difficulty ? "filled" : ""}
                  />
                ))}
                <span>
                  {
                    ["", "Starter", "Building", "Stretch", "Advanced", "Boss"][
                      ticket.difficulty
                    ]
                  }
                </span>
              </span>
              <span className="xp-tag">
                <Zap size={12} />
                {ticket.xp} XP
              </span>
              <span>
                <Clock3 size={12} />
                {ticket.parMinutes ?? (ticket.difficulty === 1 ? 10 : 15)} min
              </span>
            </div>
            <div className="story">
              <span className="quote-mark">“</span>
              <p>{ticket.userStory}</p>
            </div>
            <h3 className="section-label">
              ACCEPTANCE CRITERIA <span>{ticket.acceptance.length}</span>
            </h3>
            <ul className="acceptance-list">
              {ticket.acceptance.map((criterion, i) => (
                <li key={criterion}>
                  <span
                    className={
                      result && !result.error && completed === total
                        ? "criterion-check checked"
                        : "criterion-check"
                    }
                  >
                    {result && !result.error && completed === total ? (
                      <Check size={11} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
            <h3 className="section-label concepts-heading">
              YOU’LL PUT THESE TO WORK
            </h3>
            <div className="concept-tags">
              {ticket.concepts.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            {!recalling && <LearningNotes ticket={ticket} before />}
            <div className="taskflow-context">
              <div className="context-icon">
                <Code2 size={18} />
              </div>
              <div>
                <strong>A piece of something bigger.</strong>
                <p>
                  {engineering
                    ? "Practice the failure handling and design judgment behind a reliable feature. Record what your tests prove and what they do not."
                    : ticket.sprintId === "s1"
                      ? "This function becomes part of Taskflow’s core library. Your UI will build on it."
                      : ticket.runtime === "react"
                        ? "This component becomes part of Taskflow’s React workspace."
                        : "This behavior powers Taskflow’s interactive workspace."}
                </p>
              </div>
            </div>
            {isBoss(ticket) && (
              <div className="rubric">
                <h3 className="section-label">BOSS RUBRIC</h3>
                {ticket.rubric.map((r) => (
                  <label key={r.id}>
                    <input
                      type="checkbox"
                      disabled={r.check === "auto"}
                      checked={
                        r.check === "auto"
                          ? progress.status === "passed"
                          : (store.rubric[`${ticket.id}:${r.id}`] ?? false)
                      }
                      onChange={(e) =>
                        store.setRubric(
                          `${ticket.id}:${r.id}`,
                          e.target.checked,
                        )
                      }
                    />
                    {r.label}
                    <small>{r.check}</small>
                  </label>
                ))}
              </div>
            )}
            {!recalling && (
              <div className="hint-box">
                <div className="hint-title">
                  <Lightbulb size={16} />
                  <strong>A nudge, if you need it.</strong>
                  <span>{progress.hintsUsed}/3</span>
                </div>
                <p>
                  Use help, then reconstruct it yourself. Hints have no XP
                  penalty.
                </p>
                {ticket.hints.slice(0, progress.hintsUsed).map((hint, i) => (
                  <div className="revealed-hint" key={i}>
                    <span>HINT {i + 1}</span>
                    <pre>{hint}</pre>
                  </div>
                ))}
                {progress.hintsUsed < 3 ? (
                  <button
                    className="hint-button"
                    onClick={() => store.useHint(ticket.id)}
                  >
                    Reveal hint {progress.hintsUsed + 1}
                    <span>
                      No penalty <ChevronRight size={13} />
                    </span>
                  </button>
                ) : (
                  <small>
                    All hints revealed. Close the reference and try explaining
                    the idea in your own words.
                  </small>
                )}
              </div>
            )}
          </div>
          <div className="ticket-bottom">
            <span>
              <span className="live-dot" />{" "}
              {ticket.runtime === "react"
                ? "React + Testing Library"
                : ticket.runtime === "dom"
                  ? "Sandboxed browser DOM"
                  : "JavaScript · Web Worker"}
            </span>
            <span>Taskflow v0.{ticket.sprintId.slice(1)}</span>
          </div>
        </section>
        <section
          className={`editor-panel workspace-panel ${mobile === "editor" ? "mobile-active" : ""}`}
          aria-label="Code workspace"
        >
          <div className="panel-bar file-bar">
            <div className="file-tabs">
              {Object.keys(files).map((file) => (
                <button
                  className={currentPath === file ? "active" : ""}
                  key={file}
                  onClick={() => setPath(file)}
                >
                  <span className="language-icon">
                    {file.endsWith("tsx") || file.endsWith(".ts")
                      ? "TS"
                      : file.endsWith("jsx")
                        ? "⚛"
                        : "JS"}
                  </span>
                  {file.split("/").pop()}
                  <span className="file-dot" />
                </button>
              ))}
            </div>
            <button
              className={`icon-button ${diff ? "selected" : ""}`}
              title="Compare with starter"
              aria-label="Compare with starter"
              onClick={() => setDiff(!diff)}
            >
              <GitCompareArrows size={16} />
            </button>
          </div>
          <div className="file-breadcrumb">
            <span>{currentPath.split("/").slice(0, -1).join("/")}</span>
            <ChevronRight size={11} />
            <FileCode2 size={12} />
            {currentPath.split("/").pop()}
            {diff && <span className="diff-label">starter ↔ your code</span>}
          </div>
          <div className="monaco-container">
            <Suspense
              fallback={
                <div className="editor-loading">Preparing the editor…</div>
              }
            >
              <CodeEditor
                ticketId={ticket.id}
                path={currentPath}
                files={files}
                onChange={(code) =>
                  store.saveCode(ticket.id, currentPath, code)
                }
                onRun={run}
                onSave={format}
                theme={store.theme}
                diff={diff ? ticket.starterFiles[currentPath] : undefined}
              />
            </Suspense>
          </div>
          <div className="editor-actions">
            <button onClick={() => setReset(true)}>
              <RotateCcw size={13} />
              Reset starter
            </button>
            <button disabled={formatting} onClick={format}>
              {formatting ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Sparkles size={13} />
              )}
              Format <kbd>Ctrl S</kbd>
            </button>
          </div>
          <div className="editor-status">
            <span>
              <CheckCheck size={12} /> Saved to this browser
            </span>
            <span>
              UTF-8 <span className="status-separator">|</span>{" "}
              {currentPath.endsWith(".ts")
                ? "TypeScript"
                : currentPath.endsWith(".jsx")
                  ? "JavaScript JSX"
                  : "JavaScript"}
            </span>
          </div>
        </section>
        <section
          className={`runner-panel workspace-panel ${mobile === "results" ? "mobile-active" : ""}`}
          aria-label="Test results"
        >
          <div className="panel-bar">
            <div className="runner-title">
              <Terminal size={15} />
              Test runner
            </div>
            <span className="sandbox-tag">
              <span className="live-dot" /> Sandbox
            </span>
          </div>
          <div className="runner-body">
            <button className="run-button" onClick={run} disabled={running}>
              {running ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <Play size={15} fill="currentColor" />
              )}
              {running ? "Running tests…" : "Run tests"}
              <kbd>Ctrl ↵</kbd>
            </button>
            <div className="run-description">
              {running
                ? "Checking your code in an isolated runtime."
                : "Make it work. Then make it better."}
            </div>
            <div className="result-tabs">
              <button
                className={outputTab === "tests" ? "active" : ""}
                onClick={() => setOutputTab("tests")}
              >
                Tests <span>{total}</span>
              </button>
              <button
                className={outputTab === "console" ? "active" : ""}
                onClick={() => setOutputTab("console")}
              >
                Console{" "}
                {result?.logs.length ? (
                  <span>{result.logs.length}</span>
                ) : (
                  <span className="console-dot" />
                )}
              </button>
            </div>
            <div className="test-output" aria-live="polite" aria-busy={running}>
              {outputTab === "tests" ? (
                <>
                  <div className="test-suite-heading">
                    <ChevronDown size={13} />
                    <FileCode2 size={13} />
                    {currentPath
                      .split("/")
                      .pop()
                      ?.replace(/\.(jsx?|tsx?)$/, ".test.$1")}
                    <span>
                      {result ? `${completed}/${total}` : `${total} tests`}
                    </span>
                  </div>
                  {ticket.testNames?.map((name, i) => {
                    const test = result?.results.find((r) => r.name === name);
                    return (
                      <details
                        className={`test-row ${test ? (test.passed ? "test-passed" : "test-failed") : ""}`}
                        key={name}
                        open={test && !test.passed ? true : undefined}
                      >
                        <summary>
                          {running ? (
                            <Loader2 size={14} className="spin" />
                          ) : test ? (
                            test.passed ? (
                              <CircleCheck size={15} />
                            ) : (
                              <XCircle size={15} />
                            )
                          ) : (
                            <Circle size={14} />
                          )}
                          <span>{name}</span>
                          {!test && (
                            <span className="test-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                          )}
                        </summary>
                        <div className="assertion-detail">
                          {test ? (
                            <>
                              {test.message && <p>{test.message}</p>}
                              {test.expected !== undefined && (
                                <div className="expected">
                                  Expected: {test.expected}
                                </div>
                              )}
                              {test.received !== undefined && (
                                <div className="received">
                                  Received: {test.received}
                                </div>
                              )}
                              {test.stack && <code>{test.stack}</code>}
                              {test.passed && (
                                <p>
                                  Passed in{" "}
                                  {Math.max(1, Math.round(test.duration))} ms
                                  {test.bonus ? " · Bonus edge case" : ""}
                                </p>
                              )}
                            </>
                          ) : (
                            <p>
                              Run your implementation against this acceptance
                              check. Assertions and file locations appear here
                              when a test fails.
                            </p>
                          )}
                        </div>
                      </details>
                    );
                  })}
                  {result?.error && (
                    <div className="runner-error">
                      <XCircle size={17} />
                      <div>
                        <strong>Let’s fix that.</strong>
                        <pre>{result.error}</pre>
                      </div>
                    </div>
                  )}
                  {!result && !running && (
                    <div className="runner-empty">
                      <div className="terminal-art">
                        <Terminal size={24} />
                        <span className="terminal-spark">✦</span>
                      </div>
                      <h3>Red is a great place to start.</h3>
                      <p>
                        Run the tests to see what’s missing.
                        <br />
                        Write a little code. Watch them go green.
                      </p>
                      <span className="empty-shortcut">
                        <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run
                      </span>
                    </div>
                  )}
                  {result && !result.error && (
                    <div
                      className={`run-summary ${completed === total ? "all-green" : ""}`}
                    >
                      <div>
                        {completed === total ? (
                          <Check size={16} />
                        ) : (
                          <Circle size={14} />
                        )}
                        <strong>
                          {completed === total
                            ? "Tests pass. Now explain why."
                            : `${completed} passing. Keep building.`}
                        </strong>
                      </div>
                      <span>
                        {Math.round(result.duration)} ms · Attempt{" "}
                        {recalling ? recall?.attempts : progress.attempts}
                      </span>
                      {completed === total && !recalling && (
                        <button
                          onClick={() => {
                            setShowReference(false);
                            setReview(true);
                          }}
                        >
                          Open code review <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {result && (result.error || completed < total) && (
                    <div className="debug-coach">
                      <strong>Debug one failure at a time</strong>
                      <p>
                        Choose the first failure. Write down its input, expected
                        output, and actual output. Trace the relevant line, form
                        one hypothesis, then rerun after one change.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="console-output">
                  {result?.logs.length ? (
                    result.logs.map((log, i) => <pre key={i}>{log}</pre>)
                  ) : (
                    <>
                      <Terminal size={22} />
                      <p>Your console, without the clutter.</p>
                      <span>
                        console.log() output from your code appears here after a
                        run.
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="runner-bottom">
            <div>
              <span className="live-dot" /> Your code runs in isolation.
            </div>
            <p>No network. No setup. Just ship.</p>
            <span>3-second execution limit</span>
          </div>
        </section>
      </div>
      <div className="workspace-footer">
        <span>
          <span className="keyboard-symbol">⌘</span> <kbd>Ctrl K</kbd> Jump to a
          ticket <span className="footer-divider" /> <kbd>Ctrl ↵</kbd> Run tests
        </span>
        <span>
          Built by doing. <span className="lime-text">Shipped by you.</span> ↗
        </span>
      </div>
      <Modal
        open={reset}
        onOpenChange={setReset}
        title="Start this ticket fresh?"
        description="This replaces your current files with the starter code. Earned progress and your last passing version stay saved."
      >
        <div className="dialog-buttons">
          <button className="secondary-button" onClick={() => setReset(false)}>
            Keep editing
          </button>
          <button
            className="danger-button"
            onClick={() => {
              store.resetCode(ticket.id);
              setReset(false);
              notify("Starter code restored.");
            }}
          >
            Reset files
          </button>
        </div>
      </Modal>
      <Modal
        open={review}
        onOpenChange={setReview}
        title="Shipped. Now, a second perspective."
        description="Record your reasoning, then compare approaches. Green tests cover this exercise, not every production risk."
        wide
      >
        <div className="review-meta">
          <span className="status-pill passed">
            <Check size={12} /> {ticket.id} passed
          </span>
          <span>
            {store.earned[ticket.id] ?? 0} XP earned · {progress.hintsUsed}{" "}
            hints used
          </span>
        </div>
        <LearningNotes ticket={ticket} />
        <button
          className="secondary-button reference-reveal"
          onClick={() => setShowReference(!showReference)}
        >
          {showReference
            ? "Hide reference comparison"
            : "Compare with a reference approach"}
          <GitCompareArrows size={15} />
        </button>
        {showReference && (
          <>
            <div className="review-file-tabs">
              {Object.keys(files).map((file) => (
                <button
                  key={file}
                  className={currentPath === file ? "active" : ""}
                  onClick={() => setPath(file)}
                >
                  {file.split("/").pop()}
                </button>
              ))}
            </div>
            <div className="review-diff-labels">
              <span>Your passing version</span>
              <span>One reference approach</span>
            </div>
            {review && progress.status === "passed" && (
              <div className="review-editor">
                <Suspense
                  fallback={
                    <div className="editor-loading">Loading review…</div>
                  }
                >
                  <CodeEditor
                    ticketId={`${ticket.id}-review`}
                    path={currentPath}
                    files={progress.bestCode}
                    theme={store.theme}
                    reference={ticket.solutionFiles[currentPath]}
                    notes={ticket.review}
                    readOnly
                  />
                </Suspense>
              </div>
            )}
            <div className="review-notes">
              {ticket.review.map((note, i) => (
                <div key={i}>
                  <span className="review-note-number">{i + 1}</span>
                  <div>
                    <code>
                      {note.file}:{note.line}
                    </code>
                    <p>{note.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="dialog-buttons">
          <button
            className="secondary-button"
            onClick={() => {
              setReview(false);
              notify(
                "Keep your approach. Record its trade-offs and revisit it from memory tomorrow.",
              );
            }}
          >
            My version is fine <Check size={14} />
          </button>
          {next &&
          !next.comingSoon &&
          store.progress[next.id].status !== "locked" ? (
            <button
              className="primary-button"
              onClick={() => {
                setReview(false);
                store.selectTicket(next.id);
              }}
            >
              Next ticket <ArrowRight size={15} />
            </button>
          ) : (
            <button
              className="primary-button"
              onClick={() => {
                setReview(false);
                store.setView("board");
              }}
            >
              See the sprint board <ArrowRight size={15} />
            </button>
          )}
        </div>
      </Modal>
      {celebrate && (
        <div className="confetti" aria-label="Ticket completed">
          <button
            onClick={() => setCelebrate(false)}
            aria-label="Skip celebration"
          >
            <X size={16} />
          </button>
          {Array.from({ length: 28 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 7) * 0.07}s`,
                background: ["#c4f464", "#bda2f0", "#70c9b7"][i % 3],
                transform: `rotate(${i * 19}deg)`,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
