import { executeProject } from "./harness";
import type { CompiledProject } from "../types";
for (const name of [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "importScripts",
  "Worker",
  "SharedWorker",
]) {
  Object.defineProperty(globalThis, name, {
    value: () => {
      throw new Error(
        "Network and nested workers are disabled in this sandbox. Use the injected API mock.",
      );
    },
    writable: false,
    configurable: false,
  });
}
self.onmessage = async (event: MessageEvent<CompiledProject>) => {
  self.postMessage(await executeProject(event.data));
};
