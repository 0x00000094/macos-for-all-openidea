// Converts an IntelliJ keymap XML (macOS For All) into an OpenIDEA custom keymap.
// usage: node convert.mjs <openidea-src> <keymap.xml> <out-dir>
import fs from "node:fs";
import path from "node:path";

const [, , oiRoot, xmlPath, outDir] = process.argv;

// IDEA ids OpenIDEA already maps (src/platform/ideaActions.ts).
const base = {};
for (const m of fs.readFileSync(path.join(oiRoot, "src/platform/ideaActions.ts"), "utf8").matchAll(/^\s*"?([\w.$]+)"?\s*:\s*"([^"]+)"/gm))
  base[m[1]] = [m[2]];

// Extra IDEA → OpenIDEA mappings (checked against OpenIDEA 0.1.43 action ids).
const extra = {
  $Undo: ["edit.undo"],
  OptimizeImports: ["code.optimizeImports", "project.optimizeImports"],
  Exit: ["app.quit"],
  ShowProjectStructureSettings: ["file.projectStructure"],
  ExpressionTypeInfo: ["code.expressionTypeInfo"],
  EditorContextInfo: ["editor.contextInfo"],
  EditorStartNewLine: ["code.startNewLine"],
  EditorJoinLines: ["code.joinLines"],
  EditorDeleteLine: ["code.deleteLine"],
  FindNext: ["find.next", "find.popup.nextResult"],
  FindPrevious: ["find.previous", "find.popup.previousResult"],
  Switcher: ["navigate.switcher"],
  Resume: ["debug.resume"],
  ChooseDebugConfiguration: ["run.chooseDebugConfig"],
  ImplementMethods: ["code.implementMethods"],
  OverrideMethods: ["code.overrideMethods"],
  AutoIndentLines: ["code.autoIndentLines"],
  "Vcs.ShowMessageHistory": ["vcs.showMessageHistory"],
  EditorScrollToCenter: ["editor.scrollToCenter"],
  QuickChangeScheme: ["view.quickSwitchScheme"],
  EditorCodeBlockStart: ["editor.codeBlockStart"],
  EditorCodeBlockEnd: ["editor.codeBlockEnd"],
  EditorCodeBlockStartWithSelection: ["editor.codeBlockStartWithSelection"],
  EditorCodeBlockEndWithSelection: ["editor.codeBlockEndWithSelection"],
  EditorMatchBrace: ["editor.matchBrace"],
  "XDebugger.AttachToProcess": ["debug.attachToProcess"],
  GotoNextElementUnderCaretUsage: ["navigate.nextHighlightedUsage"],
  GotoPrevElementUnderCaretUsage: ["navigate.prevHighlightedUsage"],
  "ChangesView.Move": ["vcs.changelist.move"],
  EditorToggleColumnMode: ["editor.toggleColumnSelection"],
  SelectNextOccurrence: ["code.addCaretNextOccurrence"],
  UnselectPreviousOccurrence: ["code.unselectOccurrence"],
  SelectAllOccurrences: ["code.selectAllOccurrences"],
  NextSplitter: ["editor.nextSplitter"],
  PrevSplitter: ["editor.prevSplitter"],
  ShowNavBar: ["navigate.navigationBar"],
  ToggleFullScreen: ["window.toggleFullScreen"],
  NextProjectWindow: ["window.next"],
  PreviousProjectWindow: ["window.previous"],
  ToggleBookmarkWithMnemonic: ["navigate.toggleBookmarkWithMnemonic"],
  ToggleReadOnlyAttribute: ["file.toggleReadOnly"],
  NewElement: ["project.newFile"],
  NewElementSamePlace: ["project.newInThisDirectory"],
  EditSource: ["project.open", "debug.jumpToSource", "diff.jumpToSource"],
  "Diff.NextChange": ["diff.nextDifference"],
  "Diff.PrevChange": ["diff.prevDifference"],
  ActivateBookmarksToolWindow: ["toolwindow.bookmarks"],
  ActivateFindToolWindow: ["toolwindow.find"],
  ActivateRunToolWindow: ["toolwindow.run"],
  ActivateDebugToolWindow: ["toolwindow.debug"],
  ActivateProblemsViewToolWindow: ["toolwindow.problems"],
  ActivateStructureToolWindow: ["toolwindow.structure"],
  ActivateServicesToolWindow: ["toolwindow.services"],
  ActivateVersionControlToolWindow: ["toolwindow.git"],
  ActivateCommitToolWindow: ["toolwindow.commit"],
};
for (let i = 0; i <= 9; i++) {
  extra[`GotoBookmark${i}`] = [`navigate.gotoBookmark${i}`];
  extra[`ToggleBookmark${i}`] = [`navigate.toggleBookmark${i}`];
}
for (let i = 1; i <= 5; i++) extra[`ExpandAllToLevel${i}`] = [`code.expandAllToLevel${i}`];
const MAP = { ...base, ...extra };

// Sanity: every target must be a known OpenIDEA action id.
const known = new Set();
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name))
      for (const m of fs.readFileSync(p, "utf8").matchAll(/["']([a-z][a-zA-Z]*\.[a-zA-Z0-9.]+)["']/g)) known.add(m[1]);
  }
};
walk(path.join(oiRoot, "src"));
const missing = Object.values(extra).flat().filter((id) => !known.has(id));
if (missing.length) throw new Error("Unknown OpenIDEA ids: " + missing.join(", "));

const SWING_KEYS = {
  ENTER: "Enter", ESCAPE: "Escape", TAB: "Tab", SPACE: "Space", BACK_SPACE: "Backspace", DELETE: "Delete",
  INSERT: "Insert", HOME: "Home", END: "End", PAGE_UP: "PageUp", PAGE_DOWN: "PageDown", UP: "Up", DOWN: "Down",
  LEFT: "Left", RIGHT: "Right", OPEN_BRACKET: "[", CLOSE_BRACKET: "]", COMMA: ",", PERIOD: ".", SLASH: "/",
  BACK_SLASH: "\\", SEMICOLON: ";", QUOTE: "'", BACK_QUOTE: "`", MINUS: "-", EQUALS: "=", ADD: "NumpadAdd",
  SUBTRACT: "NumpadSubtract", MULTIPLY: "NumpadMultiply", DIVIDE: "NumpadDivide",
};
const MODS = { shift: "Shift", ctrl: "Ctrl", control: "Ctrl", alt: "Alt", meta: "Meta" };
const ORDER = ["Ctrl", "Alt", "Shift", "Meta"];
const stroke = (s) => {
  const w = s.trim().split(/\s+/).filter((x) => !/^(pressed|released|typed)$/i.test(x));
  const key = w.pop();
  if (!key || w.some((x) => !MODS[x.toLowerCase()])) return null;
  const name = /^[A-Za-z0-9]$/.test(key) ? key.toUpperCase()
    : /^F\d{1,2}$/.test(key) ? key
    : /^NUMPAD\d$/.test(key) ? key.slice(6)
    : SWING_KEYS[key];
  if (!name) return null;
  const mods = [...new Set(w.map((x) => MODS[x.toLowerCase()]))].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return [...mods, name].join("+");
};

const xml = fs.readFileSync(xmlPath, "utf8").replace(/<!--[\s\S]*?-->/g, "");
const name = xml.match(/<keymap\s[^>]*name="([^"]+)"/)[1];
const collected = new Map();
const unmapped = new Set();
const skipped = [];
for (const m of xml.matchAll(/<action\s+id="([^"]+)"\s*(\/>|>([\s\S]*?)<\/action>)/g)) {
  const [, ideaId, , body = ""] = m;
  const targets = MAP[ideaId];
  if (!targets) { unmapped.add(ideaId); continue; }
  const keys = [];
  for (const k of body.matchAll(/<keyboard-shortcut\s+first-keystroke="([^"]+)"(?:\s+second-keystroke="([^"]+)")?/g)) {
    const a = stroke(k[1]), b = k[2] ? stroke(k[2]) : "";
    if (a && b !== null) keys.push(`${a} ${b}`.trim()); else skipped.push(`${ideaId}: ${k[0]}`);
  }
  for (const k of body.matchAll(/<mouse-shortcut\s+keystroke="([^"]+)"/g)) {
    const w = k[1].trim().split(/\s+/), btn = w.pop();
    if (/^button\d$/i.test(btn) && w.every((x) => MODS[x.toLowerCase()]))
      keys.push([...w.map((x) => MODS[x.toLowerCase()]).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)), `Button${btn.slice(6)}`].join("+"));
    else skipped.push(`${ideaId}: mouse ${k[1]}`);
  }
  for (const t of targets) collected.set(t, [...new Set([...(collected.get(t) ?? []), ...keys])]);
}

const overrides = Object.fromEntries([...collected].sort(([a], [b]) => a.localeCompare(b)));
const keymap = { name, parent: "intellij-windows", overrides };
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "macos-for-all.json"), JSON.stringify({ "custom.macos-for-all": keymap }, null, 2) + "\n");

const q = (s) => JSON.stringify(s);
let toml = `[customKeymaps."custom.macos-for-all"]\nname = ${q(name)}\nparent = "intellij-windows"\n\n[customKeymaps."custom.macos-for-all".overrides]\n`;
for (const [id, keys] of Object.entries(overrides)) toml += `${q(id)} = [${keys.map(q).join(", ")}]\n`;
fs.writeFileSync(path.join(outDir, "macos-for-all.toml"), toml);

// Report: keys this keymap assigns that the Windows parent still gives to other (non-overridden) actions.
const parentSrc = fs.readFileSync(path.join(oiRoot, "src/platform/keymaps/intellij-windows.ts"), "utf8");
const parent = {};
for (const m of parentSrc.matchAll(/^\s*"([\w.]+)":\s*\[([^\]]*)\]/gm)) parent[m[1]] = [...m[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
const conflicts = [];
for (const [id, keys] of Object.entries(overrides))
  for (const k of keys)
    for (const [pid, pkeys] of Object.entries(parent))
      if (pid !== id && !(pid in overrides) && pkeys.includes(k)) conflicts.push(`${k}: ${id} vs ${pid}`);

console.log(JSON.stringify({
  name, mappedIdeaActions: new Set([...xml.matchAll(/<action\s+id="([^"]+)"/g)].map((m) => m[1]).filter((i) => MAP[i])).size,
  overrides: Object.keys(overrides).length,
  unmapped: [...unmapped], skipped, conflicts,
}, null, 2));
