// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  calendarDay,
  hintMultiplier,
  parseBackup,
  STORAGE_KEY,
  testXP,
  updateStreak,
  useStore,
} from "../src/store";
import { ticketById } from "../src/content/curriculum";
import type { RunResult } from "../src/types";
const ticket = ticketById["TF-001"];
const run = (count = 5): RunResult => ({
  logs: [],
  duration: 10,
  results: ticket.testNames!.map((name, i) => ({
    name,
    passed: i < count,
    duration: 1,
    bonus: i === 4,
  })),
});
beforeEach(() => {
  useStore.getState().reset();
  localStorage.clear();
});
describe("progress, rewards, and persistence", () => {
  it("unlocks linearly and never farms XP from repeat runs", () => {
    const store = useStore.getState();
    const first = store.recordRun(ticket.id, run(2), ticket.solutionFiles);
    expect(first.xp).toBe(40);
    expect(store.recordRun(ticket.id, run(2), ticket.solutionFiles).xp).toBe(0);
    expect(useStore.getState().progress["TF-002"].status).toBe("locked");
    expect(store.recordRun(ticket.id, run(), ticket.solutionFiles).xp).toBe(60);
    expect(useStore.getState().progress["TF-002"].status).toBe("open");
    expect(store.recordRun(ticket.id, run(), ticket.solutionFiles).xp).toBe(0);
  });
  it("records help without reducing earned or future XP", () => {
    const store = useStore.getState();
    store.recordRun(ticket.id, run(2), ticket.solutionFiles);
    store.useHint(ticket.id);
    expect(useStore.getState().earned[ticket.id]).toBe(40);
    expect(store.recordRun(ticket.id, run(), ticket.solutionFiles).xp).toBe(60);
    store.useHint(ticket.id);
    store.useHint(ticket.id);
    store.useHint(ticket.id);
    expect(useStore.getState().earned[ticket.id]).toBe(100);
    expect(useStore.getState().progress[ticket.id].hintsUsed).toBe(3);
    expect(hintMultiplier(2)).toBe(1);
    expect(testXP(ticket, 5, 0)).toBe(100);
  });
  it("awards edge cases and meaningful refactors once", () => {
    const store = useStore.getState();
    store.recordRun(ticket.id, run(), ticket.solutionFiles);
    expect(useStore.getState().badges).toContain("edge-case");
    store.recordRun(ticket.id, run(), { "src/tasks.js": "shorter code" });
    expect(useStore.getState().badges).not.toContain("considered-refactor");
    store.saveLearning(
      ticket.id,
      "explanation",
      "I extracted the validation boundary.",
    );
    store.saveLearning(
      ticket.id,
      "evidence",
      "Null still throws; a spaced title is trimmed.",
    );
    store.saveLearning(
      ticket.id,
      "tradeoff",
      "The extra helper adds indirection but shares one rule.",
    );
    store.recordRun(ticket.id, run(), {
      "src/tasks.js": "export const createTask = () => ({});",
    });
    expect(useStore.getState().badges).toContain("considered-refactor");
    expect(new Set(useStore.getState().badges).size).toBe(
      useStore.getState().badges.length,
    );
  });
  it("saves code and preserves the last passing version after a failure", () => {
    const store = useStore.getState();
    store.saveCode(ticket.id, "src/tasks.js", "my draft");
    store.recordRun(ticket.id, run(), ticket.solutionFiles);
    store.recordRun(ticket.id, run(1), { "src/tasks.js": "bad" });
    expect(useStore.getState().code[ticket.id]["src/tasks.js"]).toBe(
      "my draft",
    );
    expect(useStore.getState().progress[ticket.id].bestCode).toEqual(
      ticket.solutionFiles,
    );
    expect(localStorage.getItem(STORAGE_KEY)).toContain("my draft");
  });
  it("exports, validates, and restores all progress", () => {
    const store = useStore.getState();
    store.recordRun(ticket.id, run(), ticket.solutionFiles);
    store.saveCode(ticket.id, "src/tasks.js", "draft");
    const backup = store.exportBackup();
    store.reset();
    store.importBackup(backup);
    expect(useStore.getState().earned[ticket.id]).toBe(100);
    expect(useStore.getState().code[ticket.id]["src/tasks.js"]).toBe("draft");
    expect(() => parseBackup('{"version":7}')).toThrow();
    expect(() => parseBackup("{bad")).toThrow();
  });
  it("rejects malformed imported code and test names", () => {
    const backup = JSON.parse(useStore.getState().exportBackup());
    backup.data.code["TF-001"] = { "evil.js": "x" };
    expect(() => parseBackup(JSON.stringify(backup))).toThrow("Invalid code");
    delete backup.data.code["TF-001"];
    backup.data.passedTests["TF-001"] = ["invented"];
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(
      "Invalid passed tests",
    );
  });
  it("does not accept duplicate or unknown test results as a pass", () => {
    const bad = run();
    bad.results = bad.results.map((r) => ({
      ...r,
      name: ticket.testNames![0],
    }));
    expect(
      useStore.getState().recordRun(ticket.id, bad, ticket.solutionFiles)
        .passed,
    ).toBe(false);
  });
  it("opens the React preview without unlocking the full sprint", () => {
    useStore.getState().selectTicket("TF-031", true);
    expect(useStore.getState().selectedTicket).toBe("TF-031");
    expect(useStore.getState().progress["TF-032"].status).toBe("locked");
    expect(useStore.getState().progress["TF-021"].status).toBe("locked");
  });
  it("unlocks the next sprint only after its boss passes", () => {
    const boss = ticketById["TF-009"];
    const result: RunResult = {
      results: boss.testNames!.map((name) => ({
        name,
        passed: true,
        duration: 1,
      })),
      logs: [],
      duration: 1,
    };
    expect(useStore.getState().progress["TF-010"].status).toBe("locked");
    useStore.getState().recordRun(boss.id, result, boss.solutionFiles);
    expect(useStore.getState().progress["TF-010"].status).toBe("open");
    expect(useStore.getState().progress["TF-011"].status).toBe("locked");
  });
  it("never completes coming-soon content from an empty suite", () => {
    expect(
      useStore
        .getState()
        .recordRun("TF-021", { results: [], logs: [], duration: 0 }, {}).passed,
    ).toBe(false);
    expect(useStore.getState().progress["TF-021"].status).toBe("locked");
  });
});
describe("calendar streaks", () => {
  it("uses local calendar days and does not increment twice in one day", () => {
    expect(calendarDay(new Date(2026, 8, 7, 23, 59))).toBe("2026-09-07");
    expect(updateStreak("2026-09-07", "2026-09-07", 3, false).streak).toBe(3);
  });
  it("allows one missed day and resets after another gap", () => {
    expect(updateStreak("2026-09-07", "2026-09-09", 3, false)).toEqual({
      lastDay: "2026-09-09",
      streak: 4,
      freezeUsed: true,
    });
    expect(updateStreak("2026-09-09", "2026-09-11", 4, true).streak).toBe(1);
    expect(updateStreak("2026-09-07", "2026-09-10", 3, false).streak).toBe(1);
  });
});
