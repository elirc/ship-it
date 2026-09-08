import { parentPort } from "node:worker_threads";
import type { JSDOM } from "jsdom";
import { compileProject } from "../src/runner/compile";
import { executeProject } from "../src/runner/harness";
import type { Ticket } from "../src/types";
parentPort!.on("message", async (ticket: Ticket) => {
  let dom: JSDOM | undefined;
  try {
    const project = compileProject(ticket.solutionFiles, ticket.tests);
    if (ticket.runtime === "react" || ticket.runtime === "dom") {
      const { JSDOM } = await import("jsdom");
      dom = new JSDOM("<!doctype html><html><body></body></html>", {
        url: "https://taskflow.test",
      });
      for (const key of [
        "window",
        "document",
        "navigator",
        "HTMLElement",
        "Element",
        "Node",
        "MutationObserver",
        "getComputedStyle",
        "Event",
        "MouseEvent",
      ])
        Object.defineProperty(globalThis, key, {
          value: (dom.window as unknown as Record<string, unknown>)[key],
          configurable: true,
          writable: true,
        });
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
      const React = await import("react");
      const ReactDOM = await import("react-dom");
      const jsx = await import("react/jsx-runtime");
      const tl = await import("@testing-library/react");
      // Load jsdom's lazy selector/accessibility dependencies before timing code.
      tl.render(
        React.createElement(
          "article",
          { "aria-label": "Runtime ready" },
          React.createElement("h2", null, "Ready"),
          React.createElement("input", { type: "checkbox" }),
          React.createElement("button", null, "Submit"),
        ),
      );
      tl.screen.getByRole("article", { name: "Runtime ready" });
      tl.screen.getByRole("heading");
      tl.screen.getByRole("checkbox");
      tl.screen.getByRole("button");
      tl.cleanup();
      parentPort!.postMessage({ kind: "running" });
      const result = await executeProject(
        project,
        {
          react: React,
          "react-dom": ReactDOM,
          "react/jsx-runtime": jsx,
          "@testing-library/react": tl,
        },
        {
          React,
          render: tl.render,
          screen: tl.screen,
          fireEvent: tl.fireEvent,
          act: tl.act,
          waitFor: tl.waitFor,
          renderHook: tl.renderHook,
        },
        () => {
          tl.cleanup();
          dom!.window.document.body.replaceChildren();
        },
      );
      parentPort!.postMessage(result);
    } else {
      parentPort!.postMessage({ kind: "running" });
      parentPort!.postMessage(await executeProject(project));
    }
  } catch (error) {
    parentPort!.postMessage({
      results: [],
      logs: [],
      duration: 0,
      error: error instanceof Error ? error.stack : String(error),
    });
  } finally {
    dom?.window.close();
  }
});
