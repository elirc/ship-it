import React from "react";
import * as ReactDOM from "react-dom";
import * as client from "react-dom/client";
import * as jsx from "react/jsx-runtime";
import {
  render,
  screen,
  fireEvent,
  act,
  cleanup,
  waitFor,
  renderHook,
} from "@testing-library/react";
import { executeProject } from "./harness";
import type { CompiledProject } from "../types";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
for (const name of [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
])
  Object.defineProperty(globalThis, name, {
    value: () => {
      throw new Error("Network access is disabled. Inject a mock transport.");
    },
    configurable: false,
    writable: false,
  });
window.addEventListener(
  "message",
  async (
    event: MessageEvent<{ kind: string; id: string; project: CompiledProject }>,
  ) => {
    if (event.source !== parent || event.data?.kind !== "execute") return;
    const { id, project } = event.data;
    const result = await executeProject(
      project,
      {
        react: React,
        "react-dom": ReactDOM,
        "react-dom/client": client,
        "react/jsx-runtime": jsx,
        "@testing-library/react": {
          render,
          screen,
          fireEvent,
          act,
          cleanup,
          waitFor,
          renderHook,
        },
      },
      { React, render, screen, fireEvent, act, waitFor, renderHook },
      () => {
        cleanup();
        document.body.replaceChildren();
      },
    );
    parent.postMessage({ kind: "result", id, result }, "*");
  },
);
parent.postMessage({ kind: "ready" }, "*");
