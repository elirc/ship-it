// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseBackup, useStore } from "../src/store";
import {
  coachingFor,
  emptyLearning,
  hasReasoning,
  recallDue,
} from "../src/learning";
import { seededTickets, ticketById } from "../src/content/curriculum";
import type { RunResult } from "../src/types";
const ticket = ticketById["TF-001"];
const result = (passed = true): RunResult => ({
  results: ticket.testNames!.map((name) => ({ name, passed, duration: 0 })),
  logs: [],
  duration: 1,
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 7, 12));
  useStore.getState().reset();
  localStorage.clear();
});
afterEach(() => vi.useRealTimers());
function pass() {
  useStore.getState().recordRun(ticket.id, result(), ticket.solutionFiles);
}
function later(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  vi.setSystemTime(date);
}
describe("learning evidence and recall", () => {
  it("provides concrete coaching for every runnable exercise", () => {
    for (const t of seededTickets) {
      const c = coachingFor(t);
      expect(c.predict.length).toBeGreaterThan(20);
      expect(c.explain).not.toBe(
        "Explain the contract and how your code preserves it.",
      );
    }
  });
  it("starts with no inferred mastery or recall schedule", () => {
    expect(hasReasoning(emptyLearning())).toBe(false);
    expect(recallDue(useStore.getState().progress[ticket.id])).toBeUndefined();
    useStore.getState().startRecall(ticket.id);
    expect(useStore.getState().learning[ticket.id]).toBeUndefined();
  });
  it("separates recall drafts, attempts, XP, and passing snapshots from normal work", () => {
    pass();
    const store = useStore.getState();
    store.saveCode(ticket.id, "src/tasks.js", "my unfinished refactor");
    const original = useStore.getState().progress[ticket.id];
    store.startRecall(ticket.id);
    store.saveCode(ticket.id, "src/tasks.js", "scratch");
    expect(useStore.getState().code[ticket.id]["src/tasks.js"]).toBe(
      "my unfinished refactor",
    );
    expect(
      useStore.getState().learning[ticket.id].recall?.files["src/tasks.js"],
    ).toBe("scratch");
    store.recordRun(ticket.id, result(false), { "src/tasks.js": "scratch" });
    expect(useStore.getState().progress[ticket.id]).toEqual(original);
    expect(useStore.getState().earned[ticket.id]).toBe(100);
    store.endRecall(ticket.id);
    expect(useStore.getState().code[ticket.id]["src/tasks.js"]).toBe(
      "my unfinished refactor",
    );
  });
  it("does not advance spaced recall for early practice or repeated passes in a session", () => {
    pass();
    const store = useStore.getState();
    store.startRecall(ticket.id);
    store.recordRun(ticket.id, result(), ticket.solutionFiles);
    expect(useStore.getState().learning[ticket.id].recalls).toBe(0);
    store.endRecall(ticket.id);
    later(1);
    store.startRecall(ticket.id);
    store.recordRun(ticket.id, result(), ticket.solutionFiles);
    store.recordRun(ticket.id, result(), ticket.solutionFiles);
    expect(useStore.getState().learning[ticket.id].recalls).toBe(1);
    const due = new Date(
      recallDue(
        useStore.getState().progress[ticket.id],
        useStore.getState().learning[ticket.id],
      )!,
    );
    expect(due.getDate()).toBe(11);
    expect(useStore.getState().earned[ticket.id]).toBe(100);
  });
  it("does not advance from assisted, failed, duplicate, or unknown test results", () => {
    pass();
    later(1);
    const store = useStore.getState();
    store.startRecall(ticket.id);
    const duplicate = result();
    duplicate.results = duplicate.results.map((r) => ({
      ...r,
      name: ticket.testNames![0],
    }));
    store.recordRun(ticket.id, duplicate, ticket.solutionFiles);
    expect(useStore.getState().learning[ticket.id].recall?.passed).toBe(false);
    store.recordRun(ticket.id, result(false), ticket.solutionFiles);
    store.useHint(ticket.id);
    store.recordRun(ticket.id, result(), ticket.solutionFiles);
    expect(useStore.getState().learning[ticket.id].recalls).toBe(0);
    expect(useStore.getState().learning[ticket.id].recall?.assisted).toBe(true);
  });
  it("awards a recall badge only after three due sessions", () => {
    pass();
    const store = useStore.getState();
    for (const days of [1, 3, 7]) {
      later(days);
      store.startRecall(ticket.id);
      store.recordRun(ticket.id, result(), ticket.solutionFiles);
      store.endRecall(ticket.id);
    }
    expect(useStore.getState().learning[ticket.id].recalls).toBe(3);
    expect(useStore.getState().badges).toContain("recall-builder");
    expect(useStore.getState().badges).not.toContain("speedrun");
  });
  it("round-trips reasoning, in-progress recall, and external evidence in backups", () => {
    pass();
    const store = useStore.getState();
    store.saveLearning(ticket.id, "hypothesis", "Null would fail at trim.");
    store.saveLearning(
      ticket.id,
      "tradeoff",
      "Reject invalid input rather than invent a title.",
    );
    store.saveFieldNote(
      "design",
      "Reviewed a version-check proposal with a teammate.",
    );
    store.startRecall(ticket.id);
    store.saveCode(ticket.id, "src/tasks.js", "recall draft");
    const backup = store.exportBackup();
    store.reset();
    store.importBackup(backup);
    expect(useStore.getState().learning[ticket.id].hypothesis).toBe(
      "Null would fail at trim.",
    );
    expect(
      useStore.getState().learning[ticket.id].recall?.files["src/tasks.js"],
    ).toBe("recall draft");
    expect(useStore.getState().fieldNotes.design).toContain("teammate");
  });
  it("accepts old backups and rejects corrupt learning records", () => {
    const store = useStore.getState();
    const legacy = JSON.parse(store.exportBackup());
    delete legacy.data.learning;
    delete legacy.data.fieldNotes;
    expect(parseBackup(JSON.stringify(legacy)).learning).toEqual({});
    store.saveLearning(ticket.id, "explanation", "Boundary validation");
    const backup = JSON.parse(store.exportBackup());
    backup.data.learning[ticket.id].recalls = -1;
    expect(() => parseBackup(JSON.stringify(backup))).toThrow("recall count");
    backup.data.learning[ticket.id].recalls = 0;
    backup.data.learning[ticket.id].evidence = "x".repeat(4001);
    expect(() => parseBackup(JSON.stringify(backup))).toThrow("learning notes");
  });
  it("opens engineering practice without falsely completing prerequisite sprints", () => {
    useStore.getState().selectTicket("ENG-005");
    expect(useStore.getState().selectedTicket).toBe("ENG-005");
    expect(useStore.getState().progress["TF-021"].status).toBe("locked");
  });
});
