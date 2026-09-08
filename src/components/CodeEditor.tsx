import { useEffect, useRef } from "react";
import Editor, { DiffEditor, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import reactTypes from "../../node_modules/@types/react/index.d.ts?raw";
import globalTypes from "../../node_modules/@types/react/global.d.ts?raw";
import cssTypes from "../../node_modules/csstype/index.d.ts?raw";
import propTypes from "../../node_modules/@types/prop-types/index.d.ts?raw";
import type { ReviewNote } from "../types";

const editorGlobal = globalThis as typeof globalThis & {
  MonacoEnvironment: { getWorker: (id: string, label: string) => Worker };
};
editorGlobal.MonacoEnvironment = {
  getWorker: (_id: string, label: string) =>
    label === "typescript" || label === "javascript"
      ? new TypeScriptWorker()
      : new EditorWorker(),
};
loader.config({ monaco });
const options: monaco.languages.typescript.CompilerOptions = {
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  jsx: monaco.languages.typescript.JsxEmit.React,
  strict: true,
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: false,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  noEmit: true,
};
monaco.languages.typescript.typescriptDefaults.setCompilerOptions(options);
monaco.languages.typescript.javascriptDefaults.setCompilerOptions(options);
for (const defaults of [
  monaco.languages.typescript.typescriptDefaults,
  monaco.languages.typescript.javascriptDefaults,
]) {
  defaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });
  defaults.setEagerModelSync(true);
  defaults.addExtraLib(
    reactTypes,
    "file:///node_modules/@types/react/index.d.ts",
  );
  defaults.addExtraLib(
    globalTypes,
    "file:///node_modules/@types/react/global.d.ts",
  );
  defaults.addExtraLib(cssTypes, "file:///node_modules/csstype/index.d.ts");
  defaults.addExtraLib(
    propTypes,
    "file:///node_modules/@types/prop-types/index.d.ts",
  );
}
monaco.editor.defineTheme("ship-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8A9988", fontStyle: "italic" },
    { token: "keyword", foreground: "CBADFF" },
    { token: "string", foreground: "C1DF97" },
    { token: "number", foreground: "E8BC89" },
    { token: "identifier", foreground: "CBD4CE" },
    { token: "type.identifier", foreground: "89C7BC" },
  ],
  colors: {
    "editor.background": "#141715",
    "editor.foreground": "#CBD4CE",
    "editorLineNumber.foreground": "#879181",
    "editorLineNumber.activeForeground": "#C4F464",
    "editor.lineHighlightBackground": "#1c211d",
    "editorCursor.foreground": "#C4F464",
    "editor.selectionBackground": "#3C4C30",
    "editorIndentGuide.background1": "#252E27",
    "editorWidget.background": "#1d231f",
    "editor.inactiveSelectionBackground": "#303B2D",
  },
});
export type CodeEditorProps = {
  ticketId: string;
  path: string;
  files: Record<string, string>;
  onChange?: (code: string) => void;
  onRun?: () => void;
  onSave?: () => void;
  theme: "dark" | "light";
  diff?: string;
  reference?: string;
  readOnly?: boolean;
  notes?: ReviewNote[];
  onReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
};
export default function CodeEditor({
  ticketId,
  path,
  files,
  onChange,
  onRun,
  onSave,
  theme,
  diff,
  reference,
  readOnly = false,
  notes,
  onReady,
}: CodeEditorProps) {
  const actions = useRef({ onRun, onSave, onReady });
  actions.current = { onRun, onSave, onReady };
  useEffect(() => {
    for (const [file, code] of Object.entries(files)) {
      const uri = monaco.Uri.parse(`file:///${ticketId}/${file}`);
      const existing = monaco.editor.getModel(uri);
      if (!existing)
        monaco.editor.createModel(
          code,
          /\.tsx?$/.test(file) ? "typescript" : "javascript",
          uri,
        );
      else if (existing.getValue() !== code) existing.setValue(code);
    }
  }, [ticketId, files]);
  const settings: monaco.editor.IStandaloneEditorConstructionOptions = {
    fontSize: 12,
    fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
    lineHeight: 23,
    minimap: { enabled: false },
    padding: { top: 22, bottom: 20 },
    scrollBeyondLastLine: false,
    wordWrap: "on",
    lineNumbersMinChars: 3,
    glyphMargin: false,
    folding: false,
    tabSize: 2,
    automaticLayout: true,
    renderLineHighlight: "line",
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    readOnly,
    accessibilitySupport: "auto",
    ariaLabel: `Code editor for ${path}`,
    fixedOverflowWidgets: true,
  };
  if (diff !== undefined || reference !== undefined)
    return (
      <DiffEditor
        key={path}
        theme={theme === "dark" ? "ship-dark" : "light"}
        language={/\.tsx?$/.test(path) ? "typescript" : "javascript"}
        original={reference !== undefined ? files[path] : diff}
        modified={reference ?? files[path]}
        options={{
          ...settings,
          readOnly: true,
          renderSideBySide: true,
          originalEditable: false,
          glyphMargin: Boolean(notes),
        }}
        onMount={(editor) => {
          editor.getModifiedEditor().createDecorationsCollection(
            (notes ?? [])
              .filter((note) => note.file === path)
              .map((note) => ({
                range: new monaco.Range(note.line, 1, note.line, 1),
                options: {
                  isWholeLine: true,
                  className: "review-line",
                  glyphMarginClassName: "review-glyph",
                  glyphMarginHoverMessage: { value: note.text },
                },
              })),
          );
        }}
        loading={<div className="editor-loading">Preparing your diff…</div>}
      />
    );
  return (
    <Editor
      path={`file:///${ticketId}/${path}`}
      value={files[path]}
      language={/\.tsx?$/.test(path) ? "typescript" : "javascript"}
      theme={theme === "dark" ? "ship-dark" : "light"}
      options={settings}
      onChange={(value) => onChange?.(value ?? "")}
      onMount={(editor) => {
        editor.addAction({
          id: "ship-run",
          label: "Run tests",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          run: () => actions.current.onRun?.(),
        });
        editor.addAction({
          id: "ship-save",
          label: "Format and save",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
          run: () => actions.current.onSave?.(),
        });
        actions.current.onReady?.(editor);
      }}
      loading={
        <div className="editor-loading">
          <span className="loading-dot" />
          Loading your workspace…
        </div>
      }
    />
  );
}
