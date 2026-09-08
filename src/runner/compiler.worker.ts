import { compileProject } from "./compile";
self.onmessage = (
  event: MessageEvent<{ files: Record<string, string>; tests: string }>,
) => {
  try {
    self.postMessage({
      project: compileProject(event.data.files, event.data.tests),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
