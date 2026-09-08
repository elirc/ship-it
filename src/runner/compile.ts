import ts from "typescript";
import type { CompiledProject } from "../types";
// Guards keep synchronous DOM/React loops interruptible inside their iframe.
const guardTransform: ts.TransformerFactory<ts.SourceFile> =
  (context) => (source) => {
    const guard = () =>
      ts.factory.createExpressionStatement(
        ts.factory.createCallExpression(
          ts.factory.createIdentifier("__shipGuard"),
          undefined,
          [],
        ),
      );
    const visitor = (
      node: ts.Node,
      parent?: ts.Node,
    ): ts.VisitResult<ts.Node> => {
      const visited = ts.visitEachChild(
        node,
        (child) => visitor(child, node),
        context,
      );
      if (
        ts.isBlock(visited) &&
        parent &&
        (ts.isIterationStatement(parent, false) || ts.isFunctionLike(parent))
      )
        return ts.factory.updateBlock(visited, [
          guard(),
          ...visited.statements,
        ]);
      if (ts.isWhileStatement(visited) && !ts.isBlock(visited.statement))
        return ts.factory.updateWhileStatement(
          visited,
          visited.expression,
          ts.factory.createBlock([guard(), visited.statement]),
        );
      if (ts.isDoStatement(visited) && !ts.isBlock(visited.statement))
        return ts.factory.updateDoStatement(
          visited,
          ts.factory.createBlock([guard(), visited.statement]),
          visited.expression,
        );
      if (ts.isForStatement(visited) && !ts.isBlock(visited.statement))
        return ts.factory.updateForStatement(
          visited,
          visited.initializer,
          visited.condition,
          visited.incrementor,
          ts.factory.createBlock([guard(), visited.statement]),
        );
      if (ts.isForOfStatement(visited) && !ts.isBlock(visited.statement))
        return ts.factory.updateForOfStatement(
          visited,
          visited.awaitModifier,
          visited.initializer,
          visited.expression,
          ts.factory.createBlock([guard(), visited.statement]),
        );
      if (ts.isForInStatement(visited) && !ts.isBlock(visited.statement))
        return ts.factory.updateForInStatement(
          visited,
          visited.initializer,
          visited.expression,
          ts.factory.createBlock([guard(), visited.statement]),
        );
      return visited;
    };
    return ts.visitNode(source, (node) => visitor(node)) as ts.SourceFile;
  };
export function compileProject(
  files: Record<string, string>,
  tests: string,
): CompiledProject {
  if (!Object.keys(files).length)
    throw new Error("This ticket does not have starter files yet.");
  const compile = (source: string, file: string) => {
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        strict: true,
      },
      transformers: { before: [guardTransform] },
    });
    const errors = result.diagnostics?.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    );
    if (errors?.length)
      throw new Error(
        errors
          .map(
            (d) =>
              `${file}:${d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : 1} — ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
          )
          .join("\n"),
      );
    return result.outputText;
  };
  return {
    files: Object.fromEntries(
      Object.entries(files).map(([path, code]) => [path, compile(code, path)]),
    ),
    tests: compile(tests, "tests.spec.ts"),
    entry: Object.keys(files)[0],
  };
}
