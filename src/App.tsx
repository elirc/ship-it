import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Flame,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Moon,
  MoreHorizontal,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { accessible, useStore } from "./store";
import { allTickets, seededTickets, sprints } from "./content/curriculum";
import { Workspace } from "./components/Workspace";
import { Achievements, Board, Skills } from "./components/ProgressViews";
import { Modal } from "./components/Modal";
import { GrowthPlan } from "./components/GrowthPlan";
function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const state = useStore(),
    [palette, setPalette] = useState(false),
    [query, setQuery] = useState(""),
    [settings, setSettings] = useState(false),
    [reset, setReset] = useState(false),
    [about, setAbout] = useState(false),
    [sidebar, setSidebar] = useState(false),
    [toast, setToast] = useState(""),
    [importError, setImportError] = useState(""),
    [importText, setImportText] = useState<string | null>(null),
    [paletteIndex, setPaletteIndex] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(),
    fileInput = useRef<HTMLInputElement>(null);
  function notify(message: string) {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
  }
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        useStore.getState().setView("workspace");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    setPaletteIndex(0);
  }, [query]);
  const xp = Object.values(state.earned).reduce((sum, n) => sum + n, 0),
    level = Math.floor(xp / 500) + 1,
    levelXP = xp % 500;
  const completed = Object.values(state.progress).filter(
    (p) => p.status === "passed",
  ).length;
  const results = allTickets.filter((t) =>
    `${t.id} ${t.title} ${t.concepts.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (palette && results[paletteIndex])
      document
        .getElementById(`option-${results[paletteIndex].id}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [paletteIndex, palette, query]);
  const nav = [
    { id: "workspace" as const, label: "Workspace", icon: Code2 },
    { id: "growth" as const, label: "Growth plan", icon: BookOpen },
    { id: "board" as const, label: "Sprint board", icon: LayoutDashboard },
    { id: "skills" as const, label: "Skills map", icon: GitSkill },
    { id: "achievements" as const, label: "Achievements", icon: Trophy },
  ];
  function exportProject() {
    const files: Record<string, string> = {};
    for (const t of seededTickets)
      if (state.progress[t.id].status === "passed")
        for (const [path, code] of Object.entries(
          state.progress[t.id].bestCode,
        ))
          files[`${t.id}/${path}`] = code;
    if (!Object.keys(files).length) {
      notify("Ship your first ticket to export its passing code.");
      return;
    }
    download(
      "taskflow-source.json",
      JSON.stringify({ product: "Taskflow", files }, null, 2),
    );
    notify("Your passing Taskflow source has been exported.");
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to workspace
      </a>
      {sidebar && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "sidebar-open" : ""}`}>
        <button
          className="brand"
          onClick={() => state.setView("workspace")}
          aria-label="ship it. BETA — workspace home"
        >
          <span className="brand-mark">
            <Rocket size={22} strokeWidth={2.2} />
          </span>
          <span>
            ship it<span className="brand-period">.</span>
          </span>
          <span className="brand-beta">BETA</span>
        </button>
        <button className="workspace-switch" onClick={() => setAbout(true)}>
          <div className="workspace-avatar">E</div>
          <span>
            Your workspace<small>Personal learning space</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              className={`nav-item ${state.view === item.id ? "active" : ""}`}
              onClick={() => {
                state.setView(item.id);
                setSidebar(false);
              }}
              key={item.id}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              {item.id === "workspace" ? (
                <span className="nav-key">⌘ 1</span>
              ) : item.id === "achievements" && state.badges.length > 0 ? (
                <span className="nav-count">{state.badges.length}</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="nav-label sprint-nav-label">
          THE LEARNING PATH <span>6 SPRINTS</span>
        </div>
        <nav className="sprint-nav" aria-label="Sprints">
          {sprints.map((s, i) => {
            const shipped = state.progress[s.boss.id].status === "passed",
              locked =
                i > 0 &&
                state.progress[sprints[i - 1].boss.id].status !== "passed";
            return (
              <button
                key={s.id}
                className={`sprint-nav-item ${state.selectedSprint === s.id ? "active" : ""}`}
                onClick={() => {
                  state.selectSprint(s.id);
                  setSidebar(false);
                }}
              >
                <span className={`sprint-nav-icon sprint-color-${i}`}>
                  {shipped ? (
                    <Check size={13} />
                  ) : (
                    ["JS", "⌘", "TS", "⚛", "⬡", "↗"][i]
                  )}
                </span>
                <span>
                  <small>SPRINT 0{i + 1}</small>
                  {
                    [
                      "JavaScript fundamentals",
                      "DOM & async",
                      "TypeScript",
                      "React",
                      "Node & REST APIs",
                      "Test, secure & ship",
                    ][i]
                  }
                </span>
                {locked ? (
                  <LockKeyhole className="sprint-lock" size={12} />
                ) : (
                  <span className="sprint-active-dot" />
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button className="project-card" onClick={() => setAbout(true)}>
            <div className="project-card-top">
              <span className="taskflow-logo">
                <LayersIcon />
              </span>
              <span>THE PRODUCT YOU’RE BUILDING</span>
              <ArrowRight size={13} />
            </div>
            <h3>
              Taskflow<span>↗</span>
            </h3>
            <p>
              From an empty file
              <br />
              to your first real SaaS.
            </p>
            <div className="mini-app" aria-hidden="true">
              <div className="mini-sidebar">
                <i />
                <i />
                <i />
              </div>
              <div className="mini-main">
                <span />
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="mini-cursor">
                ↖ <span>You, shipping</span>
              </div>
            </div>
            <div className="project-progress">
              <div
                style={{
                  width: `${Math.max(3, (completed / allTickets.length) * 100)}%`,
                }}
              />
            </div>
            <small>
              {completed} / {allTickets.length} pieces built
            </small>
          </button>
          <button
            className="sidebar-settings"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={15} />
            Settings & backup
            <MoreHorizontal size={16} />
          </button>
          <div className="profile">
            <div className="profile-avatar">
              Y<span />
            </div>
            <div>
              <strong>You, the builder</strong>
              <span>
                Level {level} ·{" "}
                {level < 3
                  ? "Curious coder"
                  : level < 6
                    ? "Product builder"
                    : "Software shipper"}
              </span>
            </div>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={state.toggleTheme}
            >
              {state.theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={19} />
            </button>
            <Code2 size={16} />
            <span>Your workspace</span>
            <ChevronRight size={13} />
            <strong>
              {state.view === "workspace"
                ? "Workspace"
                : state.view === "board"
                  ? "Sprint board"
                  : state.view === "skills"
                    ? "Skills map"
                    : state.view === "growth"
                      ? "Growth plan"
                      : "Achievements"}
            </strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-button"
              aria-label="Jump to anything… ⌘ K"
              onClick={() => {
                setQuery("");
                setPalette(true);
              }}
            >
              <Search size={14} />
              <span>Jump to anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <span
              className="streak"
              title={
                state.freezeUsed
                  ? "Your grace day has been used"
                  : "One grace day available"
              }
            >
              <Flame size={16} />
              <strong>{state.streak}</strong>
              <span>day streak</span>
            </span>
            <button
              className="xp-counter"
              onClick={() => state.setView("achievements")}
            >
              <Zap size={15} />
              <strong>{xp.toLocaleString()}</strong> XP
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {state.view === "workspace" ? (
            <Workspace notify={notify} />
          ) : state.view === "board" ? (
            <Board />
          ) : state.view === "skills" ? (
            <Skills />
          ) : state.view === "growth" ? (
            <GrowthPlan />
          ) : (
            <Achievements />
          )}
        </main>
      </div>
      <Modal
        open={palette}
        onOpenChange={setPalette}
        title="Find your next ship."
        description="Search tickets, concepts, or IDs. ↑ ↓ to navigate, Enter to open."
      >
        <div className="palette-search">
          <Search size={19} />
          <input
            autoFocus
            placeholder="Try ‘arrays’, ‘React’, or ‘TF-001’…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded="true"
            aria-controls="ticket-options"
            aria-activedescendant={
              results[paletteIndex]
                ? `option-${results[paletteIndex].id}`
                : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setPaletteIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setPaletteIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                const t = results[paletteIndex];
                if (t) {
                  if (accessible(t, state) || t.id === "TF-031")
                    state.selectTicket(t.id, t.id === "TF-031");
                  else state.selectSprint(t.sprintId);
                  setPalette(false);
                }
              }
            }}
          />
        </div>
        <div
          className="palette-results"
          id="ticket-options"
          role="listbox"
          aria-label="Tickets"
        >
          {results.length ? (
            results.map((t, i) => (
              <button
                id={`option-${t.id}`}
                role="option"
                aria-selected={i === paletteIndex}
                key={t.id}
                onMouseEnter={() => setPaletteIndex(i)}
                className={i === paletteIndex ? "selected" : ""}
                onClick={() => {
                  if (accessible(t, state) || t.id === "TF-031")
                    state.selectTicket(t.id, t.id === "TF-031");
                  else state.selectSprint(t.sprintId);
                  setPalette(false);
                }}
              >
                <span className="ticket-id">{t.id}</span>
                <span>
                  {t.title}
                  <small>{t.concepts.join(" · ")}</small>
                </span>
                {t.comingSoon ? (
                  <span className="soon-tag">Soon</span>
                ) : accessible(t, state) ? (
                  <ArrowRight size={14} />
                ) : (
                  <LockKeyhole size={13} />
                )}
              </button>
            ))
          ) : (
            <div className="search-empty">
              <Search size={24} />
              <strong>No tickets found.</strong>
              <p>Try a concept like “forms” or a sprint name.</p>
            </div>
          )}
        </div>
      </Modal>
      <Modal
        open={settings}
        onOpenChange={setSettings}
        title="Your workspace, your progress."
        description="Everything stays in this browser. Back it up to take your work with you."
      >
        <div className="settings-level">
          <div>
            <span>LEVEL {level}</span>
            <strong>{xp} XP earned</strong>
            <small>
              {500 - levelXP} XP to level {level + 1}
            </small>
          </div>
          <div className="level-ring">
            <Rocket size={25} />
          </div>
        </div>
        <div className="level-progress">
          <i style={{ width: `${levelXP / 5}%` }} />
        </div>
        <div className="settings-row">
          <div>
            <strong>Appearance</strong>
            <span>
              {state.theme === "dark" ? "Dark workspace" : "Light workspace"}
            </span>
          </div>
          <button className="secondary-button" onClick={state.toggleTheme}>
            {state.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            Switch to {state.theme === "dark" ? "light" : "dark"}
          </button>
        </div>
        <div className="settings-row">
          <div>
            <strong>Progress backup</strong>
            <span>
              Code, reasoning notes, recall sessions, evidence, and progress.
            </span>
          </div>
          <div className="button-pair">
            <button
              className="secondary-button"
              onClick={() => {
                download("ship-it-backup.json", state.exportBackup());
                notify("Backup exported. Keep it somewhere safe.");
              }}
            >
              <ArrowDownToLine size={14} />
              Export
            </button>
            <button
              className="secondary-button"
              onClick={() => fileInput.current?.click()}
            >
              <ArrowUpFromLine size={14} />
              Import
            </button>
          </div>
        </div>
        <input
          ref={fileInput}
          className="sr-only"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setImportError("");
            if (file.size > 5_000_000) {
              setImportError("Choose a backup smaller than 5 MB.");
              return;
            }
            try {
              setImportText(await file.text());
            } catch {
              setImportError("That file could not be read.");
            }
          }}
        />
        {importError && (
          <p className="inline-error" role="alert">
            {importError}
          </p>
        )}
        <div className="settings-row">
          <div>
            <strong>Taskflow source</strong>
            <span>Export your passing implementations.</span>
          </div>
          <button className="secondary-button" onClick={exportProject}>
            <Code2 size={14} />
            Export code
          </button>
        </div>
        <div className="settings-row reset-row">
          <div>
            <strong>Start over</strong>
            <span>Clear code, progress, XP, and badges.</span>
          </div>
          <button className="danger-button" onClick={() => setReset(true)}>
            Reset progress
          </button>
        </div>
      </Modal>
      <Modal
        open={reset}
        onOpenChange={setReset}
        title="Reset your entire journey?"
        description="This permanently removes saved code, progress, streaks, and badges from this browser. Export a backup first if you want to keep them."
      >
        <div className="dialog-buttons">
          <button className="secondary-button" onClick={() => setReset(false)}>
            Keep my progress
          </button>
          <button
            className="danger-button"
            onClick={() => {
              state.reset();
              setReset(false);
              setSettings(false);
              notify("A fresh workspace. Your next ship starts here.");
            }}
          >
            Reset everything
          </button>
        </div>
      </Modal>
      <Modal
        open={importText !== null}
        onOpenChange={(open) => {
          if (!open) setImportText(null);
        }}
        title="Restore this backup?"
        description="Importing replaces your current progress. Export your current workspace first if you want to keep both."
      >
        <div className="dialog-buttons">
          <button
            className="secondary-button"
            onClick={() => setImportText(null)}
          >
            Cancel
          </button>
          <button
            className="primary-button"
            onClick={() => {
              try {
                state.importBackup(importText!);
                setImportText(null);
                setSettings(false);
                notify("Backup restored. Welcome back to the build.");
              } catch (error) {
                setImportError(
                  error instanceof Error ? error.message : "Invalid backup.",
                );
                setImportText(null);
              }
            }}
          >
            Restore backup
          </button>
        </div>
      </Modal>
      <Modal
        open={about}
        onOpenChange={setAbout}
        title="One product. Every layer."
        description="You’re building Taskflow: a task-tracker SaaS, from its first function to a deployable full-stack app."
      >
        <div className="about-steps">
          {sprints.map((s, i) => (
            <div key={s.id}>
              <span>0{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.goal}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="note-callout">
          <BookOpen size={20} />
          <p>
            {seededTickets.length} complete tickets are ready to build. Later
            tickets are clearly marked coming soon. The React lab is available
            as a preview.
          </p>
        </div>
        <div className="dialog-buttons">
          <button
            className="secondary-button"
            onClick={() => {
              setAbout(false);
              state.selectTicket("TF-031", true);
            }}
          >
            Try the React lab <Sparkles size={14} />
          </button>
          <button className="primary-button" onClick={() => setAbout(false)}>
            Keep building <ArrowRight size={15} />
          </button>
        </div>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={15} />
          </span>
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function GitSkill({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <path d="M10 2 17 6v8l-7 4-7-4V6zM10 2v16M3 6l14 8M17 6 3 14" />
      <path d="m10 5 4 3v4l-4 3-4-3V8z" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m3 6 7-4 7 4-7 4zM3 10l7 4 7-4M3 14l7 4 7-4" />
    </svg>
  );
}
