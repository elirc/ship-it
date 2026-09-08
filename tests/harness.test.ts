import { describe, expect, it } from "vitest";
import { compileProject } from "../src/runner/compile";
import { executeProject, expect as assertion } from "../src/runner/harness";
describe("isolated execution harness", () => {
  it("compiles TypeScript and resolves relative multifile imports", async () => {
    const project = compileProject(
      {
        "src/main.ts":
          'import { double } from "./math"; export const answer: number = double(21);',
        "src/math.ts": "export const double = (n: number): number => n * 2;",
      },
      "test('answer',()=>expect(subject.answer).toBe(42));",
    );
    const result = await executeProject(project);
    expect(result.error).toBeUndefined();
    expect(result.results[0].passed).toBe(true);
  });
  it("reports expected, received, and the learner file stack", async () => {
    const p = compileProject(
      {
        "src/tasks.js":
          'export function task(){ throw new Error("Bad task"); }',
      },
      "test('value',()=>expect(1).toBe(2)); test('stack',()=>subject.task());",
    );
    const result = await executeProject(p);
    expect(result.results[0]).toMatchObject({
      passed: false,
      expected: "2",
      received: "1",
    });
    expect(result.results[1].stack).toContain("src/tasks.js");
  });
  it("continues after thrown tests and captures console output", async () => {
    const result = await executeProject(
      compileProject(
        { "a.js": 'console.log("hello"); export const n=4;' },
        "test('throws',()=>{throw new Error('oops')});test('passes',()=>expect(subject.n).toBe(4));",
      ),
    );
    expect(result.results.map((r) => r.passed)).toEqual([false, true]);
    expect(result.logs).toEqual(['[log] "hello"']);
  });
  it("returns import failures as useful errors", async () => {
    const result = await executeProject(
      compileProject({ "a.js": 'import fs from "fs";' }, "test('x',()=>{});"),
    );
    expect(result.error).toContain("Cannot import");
  });
  it("rejects invalid syntax before execution", () => {
    expect(() => compileProject({ "a.js": "export function (" }, "")).toThrow(
      "a.js:",
    );
  });
  it("instruments all synchronous loop forms", () => {
    const p = compileProject(
      {
        "a.js":
          "export function run(){ while(true){} } export function next(){ for(;;) continue; }",
      },
      "",
    );
    expect(
      p.files["a.js"].match(/__shipGuard/g)?.length,
    ).toBeGreaterThanOrEqual(4);
  });
  it("has meaningful deep equality and rejection assertions", async () => {
    assertion({ b: 2, a: 1 }).toEqual({ a: 1, b: 2 });
    expect(() => assertion({ x: undefined }).toEqual({})).toThrow();
    await assertion(async () => {
      throw new Error("offline");
    }).toReject("offline");
  });
  it("rejects empty suites", async () => {
    expect(
      (
        await executeProject(
          compileProject({ "a.js": "export const a=1;" }, ""),
        )
      ).error,
    ).toContain("No tests");
  });
});
