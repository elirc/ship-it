import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CodeEditorProps } from "./CodeEditor";

const MonacoEditor = lazy(() => import("./CodeEditor"));

function highlight(line: string) {
  if (/^\s*(\/\/|\/\*|\*)/.test(line))
    return <span className="instant-comment">{line || " "}</span>;
  const tokens = line.split(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:export|function|return|const|let|if|throw|new|async|await|false|true)\b)/g,
  );
  return tokens.map((token, i) => (
    <span
      key={i}
      className={
        /^["']/.test(token)
          ? "instant-string"
          : /^(export|function|return|const|let|if|throw|new|async|await|false|true)$/.test(
                token,
              )
            ? "instant-keyword"
            : undefined
      }
    >
      {token}
    </span>
  ));
}

/** The plain-text editor remains usable while Monaco's language tools load. */
export default function EditorSurface(props: CodeEditorProps) {
  const comparing = props.diff !== undefined || props.reference !== undefined;
  const [active, setActive] = useState(comparing);
  const [ready, setReady] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const wantsFocus = useRef(false);
  const surface = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{
    editor: Parameters<NonNullable<CodeEditorProps["onReady"]>>[0];
    start: number;
    end: number;
    focused: boolean;
  }>();
  const preview = useRef<HTMLDivElement>(null);
  const code = props.files[props.path] ?? "";
  const latest = useRef(code);
  latest.current = code;
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!surface.current?.contains(event.target as Node))
        wantsFocus.current = false;
    };
    const blur = () => {
      wantsFocus.current = false;
    };
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    if (!ready || !pending) return;
    pendingFocus.current = undefined;
    wantsFocus.current = false;
    const model = pending.editor.getModel();
    if (!pending.focused || !model) return;
    const start = model.getPositionAt(pending.start),
      end = model.getPositionAt(pending.end);
    pending.editor.setSelection({
      startLineNumber: start.lineNumber,
      startColumn: start.column,
      endLineNumber: end.lineNumber,
      endColumn: end.column,
    });
    pending.editor.focus();
  }, [ready]);
  const lines = useMemo(
    () =>
      code.split("\n").map((line, i) => (
        <div className="instant-line" key={i}>
          <span className="instant-number">{i + 1}</span>
          {highlight(line)}
          {"\n"}
        </div>
      )),
    [code],
  );
  useEffect(() => {
    if (comparing) setActive(true);
  }, [comparing]);
  return (
    <div
      ref={surface}
      className="editor-surface"
      onPointerEnter={() => setActive(true)}
    >
      {!ready && !comparing && (
        <div className="instant-editor">
          <div className="instant-preview" aria-hidden="true">
            <div ref={preview}>{lines}</div>
          </div>
          <textarea
            ref={input}
            className="instant-input"
            aria-label={`Code editor for ${props.path}`}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            value={code}
            readOnly={props.readOnly}
            onFocus={() => {
              wantsFocus.current = true;
              setActive(true);
            }}
            onChange={(event) => props.onChange?.(event.target.value)}
            onScroll={(event) => {
              if (preview.current)
                preview.current.style.transform = `translate(${-event.currentTarget.scrollLeft}px, ${-event.currentTarget.scrollTop}px)`;
            }}
            onKeyDown={(event) => {
              if (
                (event.key === "Tab" && event.shiftKey) ||
                ((event.ctrlKey || event.metaKey) &&
                  event.key.toLowerCase() === "k")
              )
                wantsFocus.current = false;
              if (event.key === "Tab" && !event.shiftKey) {
                event.preventDefault();
                const target = event.currentTarget,
                  start = target.selectionStart,
                  end = target.selectionEnd;
                props.onChange?.(code.slice(0, start) + "  " + code.slice(end));
                requestAnimationFrame(() =>
                  target.setSelectionRange(start + 2, start + 2),
                );
              }
            }}
          />
        </div>
      )}
      {(active || comparing) && (
        <div
          className="monaco-layer"
          style={{ visibility: ready || comparing ? "visible" : "hidden" }}
          aria-hidden={!ready && !comparing}
        >
          <Suspense
            fallback={
              comparing ? (
                <div className="editor-loading">Preparing your diff…</div>
              ) : null
            }
          >
            <MonacoEditor
              {...props}
              onReady={(editor) => {
                const focused = wantsFocus.current;
                const selection = {
                  start: input.current?.selectionStart ?? 0,
                  end: input.current?.selectionEnd ?? 0,
                };
                if (editor.getValue() !== latest.current)
                  editor.setValue(latest.current);
                pendingFocus.current = { editor, ...selection, focused };
                setReady(true);
                props.onReady?.(editor);
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}
