import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./AppShell.tsx", import.meta.url), "utf8");

function callbackBody(name, nextName) {
  const start = source.indexOf(`const ${name} = useCallback`);
  const end = source.indexOf(`\n  const ${nextName}`, start);
  assert.notEqual(start, -1, `${name} callback not found`);
  assert.notEqual(end, -1, `${nextName} callback not found after ${name}`);
  return source.slice(start, end);
}

test("explicit context changes invalidate a pending workspace restore", () => {
  const callbacks = [
    ["handleCwdChange", "handleSelectSession"],
    ["handleSelectSession", "handleNewSession"],
    ["handleNewSession", "hydrateSelectedSession"],
    ["handleSessionCreated", "handleAgentEnd"],
    ["handleSessionForked", "handleInitialRestoreDone"],
    ["handleSessionDeleted", "handleOpenFile"],
  ];

  for (const [name, nextName] of callbacks) {
    assert.match(callbackBody(name, nextName), /invalidateWorkspaceRestore\(\);/);
  }
});

test("all active-session transitions share one persistence effect", () => {
  assert.match(
    source,
    /useEffect\(\(\) => \{\s+if \(!selectedSession\) return;[\s\S]*?setLastOpenSession\(projectKey, selectedSession\.id\);\s+\}, \[selectedSession\]\);/,
  );
});

test("workspace restoration remains inside the cross-project branch", () => {
  assert.match(
    callbackBody("handleCwdChange", "handleSelectSession"),
    /if \(currentProject !== newProject\) \{[\s\S]*?restoreWorkspaceContext\(newProject\);[\s\S]*?\}/,
  );
});

test("an unsent new-session draft is parked before session navigation and restored by New", () => {
  const selectSource = callbackBody("handleSelectSession", "handleNewSession");
  const newSource = callbackBody("handleNewSession", "hydrateSelectedSession");

  const parkIndex = selectSource.indexOf(
    "rekeyDraft(activeDraftKey, parkedNewSessionDraftKey(activeDraftCwd))",
  );
  const deactivateIndex = selectSource.indexOf("activeNewSessionDraftKeyRef.current = null");
  const restoreIndex = newSource.indexOf("rekeyDraft(parkedNewSessionDraftKey(cwd), draftKey)");
  const activateIndex = newSource.indexOf("activeNewSessionDraftKeyRef.current = draftKey");

  assert.notEqual(parkIndex, -1);
  assert.notEqual(deactivateIndex, -1);
  assert.notEqual(restoreIndex, -1);
  assert.notEqual(activateIndex, -1);
  assert.ok(parkIndex < deactivateIndex);
  assert.ok(restoreIndex < activateIndex);
});

test("workspace changes park and restore the matching new-session draft", () => {
  const cwdSource = callbackBody("handleCwdChange", "handleSelectSession");

  assert.match(
    cwdSource,
    /rekeyDraft\(previousDraftKey, parkedNewSessionDraftKey\(currentFreshCwd\)\)/,
  );
  assert.match(
    cwdSource,
    /rekeyDraft\(parkedNewSessionDraftKey\(cwd\), draftKey\)/,
  );
});
