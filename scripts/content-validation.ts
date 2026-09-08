import { Worker } from "node:worker_threads";
import { build } from "esbuild";
import type { RunResult, Ticket } from "../src/types";
let bundled: Promise<string> | undefined;
export function validateReference(ticket: Ticket): Promise<RunResult> {
  bundled ??= build({
    entryPoints: ["scripts/validation-worker.ts"],
    bundle: true,
    packages: "external",
    format: "cjs",
    platform: "node",
    target: "node22",
    write: false,
    logLevel: "silent",
  }).then((r) => r.outputFiles![0].text);
  return bundled.then(
    (source) =>
      new Promise((resolve, reject) => {
        const worker = new Worker(source, { eval: true });
        let timeout = setTimeout(() => {
          void worker.terminate();
          reject(
            new Error(
              `${ticket.id}: reference runtime initialization timed out`,
            ),
          );
        }, 60000);
        worker.on("message", (result: RunResult | { kind: "running" }) => {
          clearTimeout(timeout);
          if ("kind" in result) {
            timeout = setTimeout(() => {
              void worker.terminate();
              reject(
                new Error(
                  `${ticket.id}: reference execution exceeded 3 seconds`,
                ),
              );
            }, 3000);
            return;
          }
          void worker.terminate();
          resolve(result);
        });
        worker.once("error", (error) => {
          clearTimeout(timeout);
          void worker.terminate();
          reject(error);
        });
        worker.postMessage(ticket);
      }),
  );
}
