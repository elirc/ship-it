import type { CompiledProject, RunResult, Ticket } from "../types";
let runtimeCache: Partial<Record<"worker" | "iframe", string>> = {};
async function runtime(name: "worker" | "iframe") {
  if (runtimeCache[name]) return runtimeCache[name]!;
  const response = await fetch(`${import.meta.env.BASE_URL}sandbox-${name}.js`);
  if (!response.ok)
    throw new Error(
      "The sandbox could not load. Refresh the page and try again.",
    );
  return (runtimeCache[name] = await response.text());
}
const failure = (error: string): RunResult => ({
  results: [],
  logs: [],
  duration: 0,
  error,
});
export function runTicket(
  ticket: Ticket,
  files: Record<string, string>,
): { promise: Promise<RunResult>; cancel: () => void } {
  let dispose = () => {};
  let finished = false;
  let resolveResult: (r: RunResult) => void = () => {};
  const promise = new Promise<RunResult>((resolve) => {
    resolveResult = resolve;
  });
  const finish = (result: RunResult) => {
    if (finished) return;
    finished = true;
    dispose();
    resolveResult(result);
  };
  const compiler = new Worker(
    new URL("./compiler.worker.ts", import.meta.url),
    { type: "module" },
  );
  const compileTimeout = setTimeout(
    () =>
      finish(
        failure("The compiler took too long. Try refreshing the workspace."),
      ),
    30000,
  );
  dispose = () => {
    clearTimeout(compileTimeout);
    compiler.terminate();
  };
  compiler.onerror = (e) => finish(failure(`Compiler error: ${e.message}`));
  compiler.onmessage = async (
    event: MessageEvent<{ project?: CompiledProject; error?: string }>,
  ) => {
    compiler.terminate();
    clearTimeout(compileTimeout);
    if (event.data.error || !event.data.project) {
      finish(failure(event.data.error ?? "Compilation failed."));
      return;
    }
    try {
      const mode =
        ticket.runtime === "dom" || ticket.runtime === "react"
          ? "iframe"
          : "worker";
      const source = await runtime(mode);
      if (finished) return;
      const iframe = document.createElement("iframe");
      iframe.setAttribute("sandbox", "allow-scripts allow-forms");
      iframe.title = "Isolated Taskflow test environment";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;width:1px;height:1px;left:-10000px;border:0";
      const id = crypto.randomUUID(),
        nonce = crypto.randomUUID().replaceAll("-", "");
      let timeout: ReturnType<typeof setTimeout>;
      const onMessage = (e: MessageEvent) => {
        if (e.source !== iframe.contentWindow) return;
        if (e.data?.kind === "ready") {
          clearTimeout(timeout);
          timeout = setTimeout(
            () =>
              finish(
                failure(
                  "Execution timed out after 3 seconds. Check for an infinite loop, unresolved promise, or runaway recursion. Your code has been saved.",
                ),
              ),
            3000,
          );
          iframe.contentWindow?.postMessage(
            { kind: "execute", id, project: event.data.project },
            "*",
          );
        } else if (e.data?.kind === "result" && e.data.id === id)
          finish(e.data.result as RunResult);
      };
      window.addEventListener("message", onMessage);
      dispose = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        iframe.remove();
      };
      // A blob worker inherits this opaque-origin frame's CSP. Dynamic imports,
      // requests, images, forms, and external scripts are blocked by the browser.
      const bridge =
        mode === "iframe"
          ? source
          : `const blob=new Blob([${JSON.stringify(source)}],{type:'text/javascript'});const url=URL.createObjectURL(blob);const worker=new Worker(url);URL.revokeObjectURL(url);let runId;worker.onmessage=e=>{parent.postMessage({kind:'result',id:runId,result:e.data},'*');worker.terminate();};worker.onerror=e=>parent.postMessage({kind:'result',id:runId,result:{results:[],logs:[],duration:0,error:e.message}},'*');addEventListener('message',e=>{if(e.source===parent&&e.data.kind==='execute'){runId=e.data.id;worker.postMessage(e.data.project);}});parent.postMessage({kind:'ready'},'*');`;
      iframe.srcdoc = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' 'unsafe-eval'; worker-src blob:; connect-src 'none'; img-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"></head><body><script nonce="${nonce}">${bridge.replaceAll("</script", "<\\/script")}<\/script></body></html>`;
      timeout = setTimeout(
        () =>
          finish(
            failure(
              "The isolated runner did not start. Check your browser settings and reload.",
            ),
          ),
        10000,
      );
      document.body.append(iframe);
    } catch (error) {
      finish(failure(error instanceof Error ? error.message : String(error)));
    }
  };
  compiler.postMessage({ files, tests: ticket.tests });
  return {
    promise,
    cancel: () => finish(failure("Run cancelled. Your code is safe.")),
  };
}
