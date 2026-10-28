// Architectural lint: native controls belong to the shared component boundary.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../src");
const failures = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!file.endsWith(".tsx")) continue;
    const relative = path.relative(root, file).replaceAll("\\", "/");
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const primitives = relative.startsWith("components/ui/");
    const forms = relative === "components/ui/Form.tsx";
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        if (
          (!primitives &&
            /^(button|input|textarea|select|label|summary|h[1-6])$/.test(
              tag,
            )) ||
          (!forms && tag === "form")
        ) {
          const { line } = source.getLineAndCharacterOfPosition(
            node.getStart(),
          );
          failures.push(
            `${relative}:${line + 1}: use a shared component instead of <${tag}>`,
          );
        }
        for (const prop of node.attributes.properties) {
          if (
            ts.isJsxAttribute(prop) &&
            prop.name.getText(source) === "className" &&
            prop.initializer &&
            ts.isStringLiteral(prop.initializer) &&
            /(^|\s)(button|card|status-badge|icon-button)(\s|$)/.test(
              prop.initializer.text,
            )
          ) {
            failures.push(
              `${relative}: legacy shared styling; compose the shared component`,
            );
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
walk(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "UI lint passed: native controls, labels, headings and form markup are confined to shared implementations.",
  );
