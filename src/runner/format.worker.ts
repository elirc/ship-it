import { format } from "prettier/standalone";
import * as babel from "prettier/plugins/babel";
import * as typescript from "prettier/plugins/typescript";
import * as estree from "prettier/plugins/estree";
self.onmessage = async (
  event: MessageEvent<{ code: string; path: string }>,
) => {
  try {
    self.postMessage({
      code: await format(event.data.code, {
        parser: /\.tsx?$/.test(event.data.path) ? "typescript" : "babel",
        plugins: [babel, typescript, estree],
        singleQuote: false,
        tabWidth: 2,
      }),
    });
  } catch (e) {
    self.postMessage({ error: e instanceof Error ? e.message : String(e) });
  }
};
