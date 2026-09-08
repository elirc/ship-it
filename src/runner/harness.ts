import type { CompiledProject, RunResult, TestResult } from "../types";
type Context = Record<string, unknown>;
type RegisteredTest = { name: string; run: () => unknown; bonus?: boolean };
export class AssertionError extends Error {
  constructor(
    message: string,
    public expected?: string,
    public received?: string,
  ) {
    super(message);
    this.name = "AssertionError";
  }
}
export function inspect(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === undefined) return "undefined";
  try {
    return (
      JSON.stringify(value, (_key, item: unknown) =>
        typeof item === "bigint" ? `${item}n` : item,
      ) ?? String(value)
    );
  } catch {
    return String(value);
  }
}
function equal(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a),
    kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every(
      (k) => Object.hasOwn(b, k) && equal((a as Context)[k], (b as Context)[k]),
    )
  );
}
export function expect(received: unknown) {
  const check = (ok: boolean, expected: unknown, message: string) => {
    if (!ok)
      throw new AssertionError(message, inspect(expected), inspect(received));
  };
  return {
    toBe: (expected: unknown) =>
      check(
        Object.is(received, expected),
        expected,
        "Values are not identical",
      ),
    toEqual: (expected: unknown) =>
      check(equal(received, expected), expected, "Values are not deeply equal"),
    toBeTruthy: () => check(Boolean(received), true, "Expected a truthy value"),
    toThrow: (message?: string) => {
      let caught: unknown,
        thrown = false;
      try {
        (received as () => unknown)();
      } catch (e) {
        caught = e;
        thrown = true;
      }
      if (
        !thrown ||
        (message &&
          !(caught instanceof Error ? caught.message : String(caught)).includes(
            message,
          ))
      )
        throw new AssertionError(
          "Expected function to throw" + (message ? `: ${message}` : ""),
          message ?? "an error",
          "no matching error",
        );
    },
    toReject: async (message?: string) => {
      let caught: unknown,
        rejected = false;
      try {
        await (received as () => Promise<unknown>)();
      } catch (e) {
        caught = e;
        rejected = true;
      }
      if (
        !rejected ||
        (message &&
          !(caught instanceof Error ? caught.message : String(caught)).includes(
            message,
          ))
      )
        throw new AssertionError(
          "Expected promise rejection",
          message ?? "an error",
          "no matching rejection",
        );
    },
  };
}
export async function executeProject(
  project: CompiledProject,
  externals: Context = {},
  testing: Context = {},
  cleanup: () => void = () => {},
): Promise<RunResult> {
  const start = performance.now(),
    logs: string[] = [],
    results: TestResult[] = [],
    tests: RegisteredTest[] = [];
  const deadline = start + 2500;
  const guard = () => {
    if (performance.now() > deadline)
      throw new Error(
        "Execution timed out. Check loops and recursive calls; each run has a 3-second budget.",
      );
  };
  const capturedConsole = Object.fromEntries(
    ["log", "info", "warn", "error", "debug"].map((level) => [
      level,
      (...args: unknown[]) => {
        if (logs.length < 100)
          logs.push(`[${level}] ${args.map(inspect).join(" ").slice(0, 2000)}`);
      },
    ]),
  );
  const cache: Record<string, { exports: Context }> = Object.create(
    null,
  ) as Record<string, { exports: Context }>;
  const normalize = (path: string) => {
    const out: string[] = [];
    for (const p of path.split("/")) {
      if (p === "..") out.pop();
      else if (p !== "." && p) out.push(p);
    }
    return out.join("/");
  };
  function requireFile(request: string, from = ""): unknown {
    if (Object.hasOwn(externals, request)) return externals[request];
    const path = request.startsWith(".")
      ? normalize(from.split("/").slice(0, -1).join("/") + "/" + request)
      : normalize(request);
    const resolved = [
      path,
      ...[".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"].map(
        (ext) => path + ext,
      ),
    ].find((p) => Object.hasOwn(project.files, p));
    if (!resolved)
      throw new Error(
        `Cannot import "${request}". Use a project file or a supported sandbox package.`,
      );
    if (cache[resolved]) return cache[resolved].exports;
    const module = { exports: {} };
    cache[resolved] = module;
    new Function(
      "module",
      "exports",
      "require",
      "console",
      "__shipGuard",
      project.files[resolved] + `\n//# sourceURL=taskflow:///${resolved}`,
    )(
      module,
      module.exports,
      (p: string) => requireFile(p, resolved),
      capturedConsole,
      guard,
    );
    return module.exports;
  }
  try {
    const subject = requireFile(project.entry);
    const register = (
      name: string,
      run: () => unknown,
      options?: { bonus?: boolean },
    ) => tests.push({ name, run, bonus: options?.bonus });
    new Function(
      "subject",
      "test",
      "expect",
      "console",
      "__shipGuard",
      ...Object.keys(testing),
      project.tests + "\n//# sourceURL=taskflow:///tests.spec.js",
    )(
      subject,
      register,
      expect,
      capturedConsole,
      guard,
      ...Object.values(testing),
    );
    if (!tests.length)
      throw new Error(
        "No tests were registered. This ticket needs an executable test suite.",
      );
    for (const test of tests) {
      const began = performance.now();
      try {
        guard();
        await test.run();
        results.push({
          name: test.name,
          passed: true,
          bonus: test.bonus,
          duration: performance.now() - began,
        });
      } catch (error) {
        const e = error instanceof Error ? error : new Error(String(error));
        results.push({
          name: test.name,
          passed: false,
          bonus: test.bonus,
          message: e.message,
          expected:
            error instanceof AssertionError ? error.expected : undefined,
          received:
            error instanceof AssertionError ? error.received : undefined,
          stack:
            e.stack
              ?.split("\n")
              .find((l) => l.includes("taskflow:///"))
              ?.trim() ?? e.stack?.split("\n")[1]?.trim(),
          duration: performance.now() - began,
        });
      } finally {
        cleanup();
      }
    }
    return { results, logs, duration: performance.now() - start };
  } catch (error) {
    return {
      results,
      logs,
      duration: performance.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
