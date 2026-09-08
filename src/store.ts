import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { allTickets, isBoss, sprints, ticketById } from "./content/curriculum";
import type { LearningRecord, Progress, RunResult, Ticket } from "./types";
import {
  emptyLearning,
  fieldAssignments,
  hasReasoning,
  recallDue,
  suitePassed,
} from "./learning";
export const STORAGE_KEY = "ship-it.progress.v1";
export const badgeDefinitions = [
  {
    id: "considered-refactor",
    name: "Considered Refactor",
    description:
      "Resubmit changed passing code with a recorded explanation, test evidence, and trade-off. Notes are self-reported.",
    icon: "refactor",
  },
  {
    id: "edge-case",
    name: "Edge Case Hunter",
    description: "Pass a hidden bonus edge case.",
    icon: "target",
  },
  {
    id: "no-any",
    name: "No Any Zone",
    description: "Complete TypeScript with zero explicit any types.",
    icon: "shield",
  },
  {
    id: "hook-smith",
    name: "Hook Smith",
    description: "Reuse a custom hook in two passing tickets.",
    icon: "hook",
  },
  {
    id: "steady-builder",
    name: "Steady Builder",
    description: "Pass 10 tickets. Using help is part of learning.",
    icon: "wall",
  },
  {
    id: "recall-builder",
    name: "Recall Builder",
    description:
      "Complete three due recall sessions from starter code without opening help in the app.",
    icon: "timer",
  },
  {
    id: "ship-it",
    name: "Ship It",
    description: "Pass the final boss and ship Taskflow.",
    icon: "rocket",
  },
];
export function calendarDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dayNumber(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
}
export function updateStreak(
  lastDay: string | undefined,
  day: string,
  streak: number,
  freezeUsed: boolean,
) {
  if (lastDay === day) return { lastDay, streak, freezeUsed };
  const gap = lastDay ? dayNumber(day) - dayNumber(lastDay) : Infinity;
  return {
    lastDay: day,
    streak: gap === 1 || (gap === 2 && !freezeUsed) ? streak + 1 : 1,
    freezeUsed: freezeUsed || gap === 2,
  };
}
export function hintMultiplier(_hints: number) {
  return 1;
}
export function testXP(ticket: Ticket, passedCount: number, hints: number) {
  return Math.floor(
    (ticket.xp * hintMultiplier(hints) * passedCount) /
      Math.max(1, ticket.testNames?.length ?? 1),
  );
}
const fresh = (): Progress => ({
  ticketId: "",
  status: "locked",
  attempts: 0,
  hintsUsed: 0,
  bestCode: {},
});
function initialProgress() {
  return Object.fromEntries(
    allTickets.map((t, i) => [
      t.id,
      {
        ...fresh(),
        ticketId: t.id,
        status:
          i === 0 || t.track === "engineering"
            ? ("open" as const)
            : ("locked" as const),
      },
    ]),
  );
}
type View = "workspace" | "board" | "skills" | "achievements" | "growth";
export type SavedState = {
  progress: Record<string, Progress>;
  code: Record<string, Record<string, string>>;
  passedTests: Record<string, string[]>;
  earned: Record<string, number>;
  badges: string[];
  streak: number;
  lastDay?: string;
  freezeUsed: boolean;
  startedAt: Record<string, number>;
  rubric: Record<string, boolean>;
  learning: Record<string, LearningRecord>;
  fieldNotes: Record<string, string>;
};
const initial = (): SavedState => ({
  progress: initialProgress(),
  code: {},
  passedTests: {},
  earned: {},
  badges: [],
  streak: 0,
  freezeUsed: false,
  startedAt: {},
  rubric: {},
  learning: {},
  fieldNotes: {},
});
type Store = SavedState & {
  selectedTicket: string;
  selectedSprint: string;
  view: View;
  theme: "dark" | "light";
  preview: boolean;
  selectTicket: (id: string, preview?: boolean) => void;
  selectSprint: (id: string) => void;
  setView: (v: View) => void;
  toggleTheme: () => void;
  saveCode: (id: string, file: string, code: string) => void;
  resetCode: (id: string) => void;
  useHint: (id: string) => void;
  recordRun: (
    id: string,
    result: RunResult,
    files: Record<string, string>,
  ) => { xp: number; passed: boolean; firstPass: boolean; badges: string[] };
  setRubric: (key: string, value: boolean) => void;
  saveLearning: (
    id: string,
    field: "hypothesis" | "explanation" | "evidence" | "tradeoff",
    value: string,
  ) => void;
  saveFieldNote: (id: string, value: string) => void;
  startRecall: (id: string) => void;
  endRecall: (id: string) => void;
  reset: () => void;
  importBackup: (json: string) => void;
  exportBackup: () => string;
};
export function accessible(
  ticket: Ticket,
  state: Pick<Store, "progress" | "preview">,
) {
  return (
    !ticket.comingSoon &&
    (ticket.track === "engineering" ||
      state.progress[ticket.id]?.status !== "locked" ||
      (state.preview && ticket.id === "TF-031"))
  );
}
function unlock(progress: Record<string, Progress>) {
  for (let si = 0; si < sprints.length; si++) {
    const sprint = sprints[si];
    if (si > 0 && progress[sprints[si - 1].boss.id].status !== "passed")
      continue;
    let previousPassed = true;
    for (const t of [...sprint.tickets, sprint.boss]) {
      if (previousPassed && !t.comingSoon && progress[t.id].status === "locked")
        progress[t.id] = { ...progress[t.id], status: "open" };
      previousPassed = progress[t.id].status === "passed";
    }
  }
  // The React lab is an explicit preview track, separate from sprint completion.
  for (let i = 1; i < 4; i++) {
    const previous = sprints[3].tickets[i - 1],
      current = sprints[3].tickets[i];
    if (
      progress[previous.id].status === "passed" &&
      progress[current.id].status === "locked"
    )
      progress[current.id] = { ...progress[current.id], status: "open" };
  }
}
function backupFrom(state: SavedState): SavedState {
  return {
    progress: state.progress,
    code: state.code,
    passedTests: state.passedTests,
    earned: state.earned,
    badges: state.badges,
    streak: state.streak,
    lastDay: state.lastDay,
    freezeUsed: state.freezeUsed,
    startedAt: state.startedAt,
    rubric: state.rubric,
    learning: state.learning,
    fieldNotes: state.fieldNotes,
  };
}
export function parseBackup(json: string): SavedState {
  if (json.length > 5_000_000)
    throw new Error("Backup exceeds the 5 MB limit.");
  const parsed: unknown = JSON.parse(json);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("data" in parsed)
  )
    throw new Error("Choose a Ship It version 1 backup.");
  const data = parsed.data as Partial<SavedState>;
  if (
    !data ||
    !data.progress ||
    !data.code ||
    !data.passedTests ||
    !data.earned ||
    !Array.isArray(data.badges)
  )
    throw new Error("This backup is missing required progress data.");
  const result = initial();
  for (const t of allTickets) {
    const p = data.progress[t.id];
    if (!p) continue;
    if (
      p.ticketId !== t.id ||
      !["locked", "open", "passed"].includes(p.status) ||
      !Number.isInteger(p.attempts) ||
      p.attempts < 0 ||
      ![0, 1, 2, 3].includes(p.hintsUsed)
    )
      throw new Error(`Invalid progress for ${t.id}.`);
    const readFiles = (files: unknown) => {
      if (!files || typeof files !== "object")
        throw new Error("Invalid saved files.");
      const entries = Object.entries(files);
      if (
        entries.some(
          ([path, value]) =>
            !Object.hasOwn(t.starterFiles, path) ||
            typeof value !== "string" ||
            value.length > 200000,
        )
      )
        throw new Error(`Invalid code for ${t.id}.`);
      return Object.fromEntries(entries) as Record<string, string>;
    };
    result.progress[t.id] = {
      ticketId: t.id,
      status: p.status,
      attempts: p.attempts,
      hintsUsed: p.hintsUsed,
      bestCode: readFiles(p.bestCode),
      ...(typeof p.passedAt === "string" ? { passedAt: p.passedAt } : {}),
    };
    if (data.code[t.id]) result.code[t.id] = readFiles(data.code[t.id]);
    const learning = data.learning?.[t.id];
    if (learning !== undefined) {
      if (!learning || typeof learning !== "object")
        throw new Error("Invalid learning record.");
      const record = emptyLearning();
      for (const key of [
        "hypothesis",
        "explanation",
        "evidence",
        "tradeoff",
      ] as const) {
        if (typeof learning[key] !== "string" || learning[key].length > 4000)
          throw new Error("Invalid learning notes.");
        record[key] = learning[key];
      }
      if (
        !Number.isInteger(learning.recalls) ||
        learning.recalls < 0 ||
        learning.recalls > 100000
      )
        throw new Error("Invalid recall count.");
      record.recalls = learning.recalls;
      if (learning.lastRecallAt !== undefined) {
        if (
          typeof learning.lastRecallAt !== "string" ||
          !Number.isFinite(Date.parse(learning.lastRecallAt))
        )
          throw new Error("Invalid recall date.");
        record.lastRecallAt = learning.lastRecallAt;
      }
      if (learning.recall !== undefined) {
        const r = learning.recall;
        if (
          !r ||
          typeof r.active !== "boolean" ||
          typeof r.assisted !== "boolean" ||
          typeof r.passed !== "boolean" ||
          typeof r.spaced !== "boolean" ||
          !Number.isInteger(r.attempts) ||
          r.attempts < 0 ||
          typeof r.startedAt !== "string" ||
          !Number.isFinite(Date.parse(r.startedAt))
        )
          throw new Error("Invalid recall session.");
        record.recall = {
          active: r.active,
          assisted: r.assisted,
          attempts: r.attempts,
          startedAt: r.startedAt,
          passed: r.passed,
          spaced: r.spaced,
          files: { ...t.starterFiles, ...readFiles(r.files) },
        };
      }
      result.learning[t.id] = record;
    }
    const names = data.passedTests[t.id] ?? [];
    if (
      !Array.isArray(names) ||
      names.some((n) => typeof n !== "string" || !t.testNames?.includes(n))
    )
      throw new Error("Invalid passed tests.");
    result.passedTests[t.id] = [...new Set(names)];
    result.earned[t.id] = testXP(
      t,
      result.passedTests[t.id].length,
      p.hintsUsed,
    );
    if (
      typeof data.startedAt?.[t.id] === "number" &&
      Number.isFinite(data.startedAt[t.id])
    )
      result.startedAt[t.id] = data.startedAt[t.id];
  }
  result.badges = [
    ...new Set(
      data.badges.filter((b) => badgeDefinitions.some((def) => def.id === b)),
    ),
  ];
  result.streak =
    Number.isInteger(data.streak) && data.streak! >= 0
      ? Math.min(data.streak!, 100000)
      : 0;
  result.lastDay =
    typeof data.lastDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.lastDay)
      ? data.lastDay
      : undefined;
  result.freezeUsed = data.freezeUsed === true;
  result.rubric = Object.fromEntries(
    Object.entries(data.rubric ?? {}).filter(
      ([key, value]) =>
        typeof value === "boolean" &&
        allTickets.some(
          (t) => isBoss(t) && t.rubric.some((r) => `${t.id}:${r.id}` === key),
        ),
    ),
  );
  for (const assignment of fieldAssignments) {
    const note = data.fieldNotes?.[assignment.id];
    if (note !== undefined) {
      if (typeof note !== "string" || note.length > 8000)
        throw new Error("Invalid fieldwork evidence.");
      result.fieldNotes[assignment.id] = note;
    }
  }
  unlock(result.progress);
  return result;
}
export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial(),
      selectedTicket: "TF-001",
      selectedSprint: "s1",
      view: "workspace",
      theme: "dark",
      preview: false,
      selectTicket: (id, preview = false) => {
        const t = ticketById[id];
        if (!t || t.comingSoon) return;
        const state = get();
        if (
          !accessible(t, {
            progress: state.progress,
            preview: preview || state.preview,
          })
        )
          return;
        set({
          selectedTicket: id,
          selectedSprint: t.sprintId,
          view: "workspace",
          preview: preview || state.preview,
          startedAt: {
            ...state.startedAt,
            [id]: state.startedAt[id] ?? Date.now(),
          },
        });
      },
      selectSprint: (id) => {
        if (sprints.some((s) => s.id === id))
          set({ selectedSprint: id, view: "board" });
      },
      setView: (view) => set({ view }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      saveCode: (id, file, code) =>
        set((s) => {
          const record = s.learning[id];
          if (record?.recall?.active)
            return {
              learning: {
                ...s.learning,
                [id]: {
                  ...record,
                  recall: {
                    ...record.recall,
                    files: { ...record.recall.files, [file]: code },
                  },
                },
              },
            };
          return {
            code: {
              ...s.code,
              [id]: {
                ...ticketById[id].starterFiles,
                ...s.code[id],
                [file]: code,
              },
            },
            startedAt: { ...s.startedAt, [id]: s.startedAt[id] ?? Date.now() },
          };
        }),
      resetCode: (id) =>
        set((s) => {
          const record = s.learning[id];
          if (record?.recall?.active)
            return {
              learning: {
                ...s.learning,
                [id]: {
                  ...record,
                  recall: {
                    ...record.recall,
                    files: { ...ticketById[id].starterFiles },
                  },
                },
              },
            };
          return {
            code: { ...s.code, [id]: { ...ticketById[id].starterFiles } },
          };
        }),
      useHint: (id) =>
        set((s) => {
          const record = s.learning[id];
          if (record?.recall?.active)
            return {
              learning: {
                ...s.learning,
                [id]: {
                  ...record,
                  recall: { ...record.recall, assisted: true },
                },
              },
            };
          const p = s.progress[id];
          if (p.hintsUsed >= 3) return s;
          const hintsUsed = (p.hintsUsed + 1) as Progress["hintsUsed"];
          return {
            progress: { ...s.progress, [id]: { ...p, hintsUsed } },
            earned: {
              ...s.earned,
              [id]: testXP(
                ticketById[id],
                s.passedTests[id]?.length ?? 0,
                hintsUsed,
              ),
            },
          };
        }),
      recordRun: (id, result, files) => {
        const s = get(),
          ticket = ticketById[id],
          old = s.progress[id],
          known = new Set(ticket.testNames ?? []);
        const passed = suitePassed(ticket, result);
        const record = s.learning[id];
        if (record?.recall?.active) {
          const recall = record.recall;
          const due = recallDue(old, record);
          const spaced =
            passed &&
            !recall.passed &&
            !recall.assisted &&
            due !== undefined &&
            Date.parse(recall.startedAt) >= due;
          const nextRecord = {
            ...record,
            recalls: record.recalls + (spaced ? 1 : 0),
            ...(spaced ? { lastRecallAt: new Date().toISOString() } : {}),
            recall: {
              ...recall,
              files: { ...files },
              attempts: recall.attempts + 1,
              passed: recall.passed || passed,
              spaced: recall.spaced || spaced,
            },
          };
          const learning = { ...s.learning, [id]: nextRecord };
          const badges = new Set(s.badges);
          if (Object.values(learning).reduce((n, r) => n + r.recalls, 0) >= 3)
            badges.add("recall-builder");
          set({ learning, badges: [...badges] });
          return {
            xp: 0,
            passed,
            firstPass: false,
            badges: [...badges].filter((b) => !s.badges.includes(b)),
          };
        }
        const names = [
          ...new Set([
            ...(s.passedTests[id] ?? []),
            ...result.results
              .filter((t) => t.passed && known.has(t.name))
              .map((t) => t.name),
          ]),
        ];
        const earned = testXP(ticket, names.length, old.hintsUsed),
          delta = earned - (s.earned[id] ?? 0);
        const progress = {
          ...s.progress,
          [id]: {
            ...old,
            attempts: old.attempts + 1,
            status: passed ? ("passed" as const) : old.status,
            bestCode: passed ? { ...files } : old.bestCode,
            passedAt: passed
              ? (old.passedAt ?? new Date().toISOString())
              : old.passedAt,
          },
        };
        unlock(progress);
        const badges = new Set(s.badges);
        if (result.results.some((t) => t.passed && t.bonus))
          badges.add("edge-case");
        if (
          passed &&
          old.status === "passed" &&
          JSON.stringify(files) !== JSON.stringify(old.bestCode) &&
          hasReasoning(s.learning[id])
        )
          badges.add("considered-refactor");
        if (
          Object.values(progress).filter((p) => p.status === "passed").length >=
          10
        )
          badges.add("steady-builder");
        if (
          progress[sprints[2].boss.id].status === "passed" &&
          [...sprints[2].tickets, sprints[2].boss].every(
            (t) =>
              progress[t.id].status === "passed" &&
              !/\bany\b/.test(
                Object.values(progress[t.id].bestCode).join("\n"),
              ),
          )
        )
          badges.add("no-any");
        const hookUses = new Map<string, Set<string>>();
        for (const p of Object.values(progress).filter(
          (p) => p.status === "passed",
        ))
          for (const [path, source] of Object.entries(p.bestCode))
            for (const match of source.matchAll(
              /(?:export\s+)?function\s+(use[A-Z]\w*)\s*\(/g,
            )) {
              const key = match[1] + ":" + source.trim();
              const users = hookUses.get(key) ?? new Set<string>();
              if (
                Object.entries(p.bestCode).some(
                  ([file, code]) =>
                    file !== path && code.includes(match[1] + "("),
                )
              )
                users.add(p.ticketId);
              hookUses.set(key, users);
            }
        if ([...hookUses.values()].some((uses) => uses.size >= 2))
          badges.add("hook-smith");
        if (progress[sprints[5].boss.id].status === "passed")
          badges.add("ship-it");
        const streak = result.results.some((t) => t.passed)
          ? updateStreak(s.lastDay, calendarDay(), s.streak, s.freezeUsed)
          : { lastDay: s.lastDay, streak: s.streak, freezeUsed: s.freezeUsed };
        set({
          progress,
          passedTests: { ...s.passedTests, [id]: names },
          earned: { ...s.earned, [id]: earned },
          badges: [...badges],
          ...streak,
        });
        return {
          xp: delta,
          passed,
          firstPass: passed && old.status !== "passed",
          badges: [...badges].filter((b) => !s.badges.includes(b)),
        };
      },
      setRubric: (key, value) =>
        set((s) => ({ rubric: { ...s.rubric, [key]: value } })),
      saveLearning: (id, field, value) =>
        set((s) => ({
          learning: {
            ...s.learning,
            [id]: {
              ...(s.learning[id] ?? emptyLearning()),
              [field]: value.slice(0, 4000),
            },
          },
        })),
      saveFieldNote: (id, value) =>
        set((s) => ({
          fieldNotes: { ...s.fieldNotes, [id]: value.slice(0, 8000) },
        })),
      startRecall: (id) => {
        const s = get(),
          ticket = ticketById[id];
        if (!ticket || ticket.comingSoon || s.progress[id].status !== "passed")
          return;
        const record = s.learning[id] ?? emptyLearning();
        if (!record.recall?.active)
          set({
            learning: {
              ...s.learning,
              [id]: {
                ...record,
                recall: {
                  active: true,
                  files: { ...ticket.starterFiles },
                  assisted: false,
                  attempts: 0,
                  startedAt: new Date().toISOString(),
                  passed: false,
                  spaced: false,
                },
              },
            },
          });
        get().selectTicket(id);
      },
      endRecall: (id) =>
        set((s) => {
          const record = s.learning[id];
          return record?.recall
            ? {
                learning: {
                  ...s.learning,
                  [id]: {
                    ...record,
                    recall: { ...record.recall, active: false },
                  },
                },
              }
            : s;
        }),
      reset: () =>
        set({
          ...initial(),
          selectedTicket: "TF-001",
          selectedSprint: "s1",
          view: "workspace",
          preview: false,
        }),
      exportBackup: () =>
        JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: backupFrom(get()),
          },
          null,
          2,
        ),
      importBackup: (json) =>
        set({
          ...parseBackup(json),
          selectedTicket: "TF-001",
          selectedSprint: "s1",
          view: "workspace",
          preview: false,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        ...backupFrom(s),
        selectedTicket: s.selectedTicket,
        selectedSprint: s.selectedSprint,
        view: s.view,
        theme: s.theme,
        preview: s.preview,
      }),
      merge: (persisted, current) => {
        try {
          const p = persisted as Partial<Store>;
          const validated = parseBackup(
            JSON.stringify({ version: 1, data: p }),
          );
          return {
            ...current,
            ...validated,
            selectedTicket:
              p.selectedTicket &&
              ticketById[p.selectedTicket] &&
              !ticketById[p.selectedTicket].comingSoon
                ? p.selectedTicket
                : "TF-001",
            selectedSprint: sprints.some((s) => s.id === p.selectedSprint)
              ? p.selectedSprint!
              : "s1",
            view: [
              "workspace",
              "board",
              "skills",
              "achievements",
              "growth",
            ].includes(p.view ?? "")
              ? p.view!
              : "workspace",
            theme: p.theme === "light" ? "light" : "dark",
            preview: p.preview === true,
          };
        } catch {
          return current;
        }
      },
    },
  ),
);
