#!/usr/bin/env node
/**
 * setup-n8n.mjs — Imports + activates Pratyavartan workflows into local n8n (npx, NO Docker).
 * RUN THIS WHILE n8n IS STOPPED (CLI import locks n8n's SQLite).
 * Windows/Mac/Linux safe — pure Node, no bash.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const N8N_URL = process.env.N8N_URL || "http://localhost:5678";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8010";
const WORKFLOWS = [
  { file: "n8n/promise_to_pay_orchestrator.json", name: "Promise-to-Pay Orchestrator" },
  { file: "n8n/mandate_retry_sequencer.json", name: "Mandate Retry Sequencer" },
];

const log = (m) => console.log(`\x1b[36m▸\x1b[0m ${m}`);
const ok = (m) => console.log(`\x1b[32m✔\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m⚠\x1b[0m ${m}`);
const fail = (m) => { console.error(`\x1b[31m✖ ${m}\x1b[0m`); process.exit(1); };

async function isUp(url, path = "") {
  try {
    const r = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch { return false; }
}

/** Validates: JSON parses, all connection sources/targets exist as nodes, warns on orphan nodes. */
function validateWorkflow(file) {
  let wf;
  try { wf = JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (e) { fail(`${file}: invalid JSON — ${e.message}`); }
  if (!wf.name || !Array.isArray(wf.nodes) || !wf.connections)
    fail(`${file}: not a valid n8n workflow export (missing name/nodes/connections)`);

  const nodeNames = new Set(wf.nodes.map((n) => n.name));
  for (const [src, conns] of Object.entries(wf.connections)) {
    if (!nodeNames.has(src)) fail(`${file}: connection source "${src}" has no matching node`);
    for (const branch of conns.main ?? []) {
      for (const t of branch ?? [])
        if (!nodeNames.has(t.node)) fail(`${file}: connection target "${t.node}" has no matching node`);
    }
  }
  const connected = new Set(Object.keys(wf.connections));
  for (const n of wf.nodes) {
    if (n.type.includes("stickyNote") || n.type.includes("webhook")) continue;
    const isTarget = Object.values(wf.connections).some((c) =>
      (c.main ?? []).some((b) => (b ?? []).some((t) => t.node === n.name))
    );
    if (!connected.has(n.name) && !isTarget)
      warn(`orphan node "${n.name}" in ${file} — verify it is intentionally unused`);
  }
  return wf.name;
}

async function findWorkflowId(name) {
  try {
    const raw = execSync(`npx n8n export:workflow --all`, { stdio: ["pipe", "pipe", "ignore"] }).toString("utf8");
    const jsonStart = raw.indexOf("[");
    if (jsonStart !== -1) {
      const list = JSON.parse(raw.slice(jsonStart));
      if (Array.isArray(list)) {
        for (const wf of list) {
          if (wf.name === name) return wf.id;
        }
      }
    }
  } catch { /* fallback */ }

  const outFile = "tmp_n8n_export.json";
  try {
    execSync(`npx n8n export:workflow --all --output=${outFile}`, { stdio: "pipe" });
    if (fs.existsSync(outFile)) {
      const content = JSON.parse(fs.readFileSync(outFile, "utf8"));
      fs.rmSync(outFile, { force: true });
      if (Array.isArray(content)) {
        for (const wf of content) {
          if (wf.name === name) return wf.id;
        }
      } else if (content.name === name) {
        return content.id;
      }
    }
  } catch { /* skip */ }
  return null;
}

(async () => {
  console.log("\n\x1b[1m🛡️  Pratyavartan — n8n Setup (no Docker)\x1b[0m\n");

  // 1. Node version gate
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) fail(`Node 18+ required, found ${process.versions.node}. Upgrade Node first.`);
  ok(`Node ${process.versions.node}`);

  // 2. n8n must NOT be running (SQLite lock)
  if (await isUp(N8N_URL, "/healthz"))
    fail(`n8n is ALREADY RUNNING at ${N8N_URL}. Stop it first (Ctrl+C), then re-run this script.`);
  ok("n8n is stopped — safe to import");

  // 3. Backend advisory check
  if (await isUp(BACKEND_URL, "/health")) ok(`Backend reachable at ${BACKEND_URL}`);
  else warn(`Backend NOT running at ${BACKEND_URL} — start it before running the test script`);

  // 4. Validate all workflow files
  for (const wf of WORKFLOWS) {
    if (!fs.existsSync(wf.file)) fail(`Missing file: ${wf.file}`);
    validateWorkflow(wf.file);
    ok(`Validated: ${wf.file}`);
  }

  // 5. Import
  for (const wf of WORKFLOWS) {
    execSync(`npx n8n import:workflow --input=${wf.file}`, { stdio: "inherit" });
    ok(`Imported: "${wf.name}"`);
  }

  // 6. Activate each
  for (const wf of WORKFLOWS) {
    const id = await findWorkflowId(wf.name);
    if (!id) fail(`Imported but ID not found for "${wf.name}" — open n8n UI and toggle manually`);
    try {
      execSync(`npx n8n update:workflow --id=${id} --active=true`, { stdio: "pipe" });
      ok(`Activated: "${wf.name}" (id: ${id})`);
    } catch {
      warn(`CLI activation unsupported on your n8n version — toggle "${wf.name}" ACTIVE in the UI`);
    }
  }
  fs.rmSync("tmp_n8n_export", { recursive: true, force: true });

  console.log(`
\x1b[32m═══════════ SETUP COMPLETE ═══════════\x1b[0m

Manual steps left (3):
  1. Start n8n:            npm run n8n
  2. Open http://localhost:5678 → create local owner account (first time only)
  3. Confirm both workflows show the ACTIVE toggle (green)

Then prove it works:      npm run n8n:test
`);
})().catch((e) => fail(e.message));
