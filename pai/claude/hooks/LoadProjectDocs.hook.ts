#!/usr/bin/env bun
/**
 * LoadProjectDocs.hook.ts - Load @mention docs from AGENTS.md (SessionStart)
 *
 * Reads the documentation files referenced via @mentions in AGENTS.md and
 * injects them as system-reminder content at session start.
 */

import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, "../..");

const DOCS = [
  "documentation/TELOS.md",
  "documentation/requirements/requirements.md",
  "documentation/requirements/agent.md",
  "documentation/requirements/resources.md",
  "documentation/requirements/governance.md",
  "documentation/specifications/specifications.md",
];

const parts: string[] = [];

for (const relPath of DOCS) {
  const fullPath = resolve(PROJECT_DIR, relPath);
  if (!existsSync(fullPath)) {
    console.error(`⚠️ LoadProjectDocs: not found: ${relPath}`);
    continue;
  }
  try {
    const content = readFileSync(fullPath, "utf-8").trim();
    if (content.length === 0) continue;
    parts.push(`### ${relPath}\n\n${content}`);
    console.error(`📄 Loaded: ${relPath} (${content.length} chars)`);
  } catch (err) {
    console.error(`⚠️ LoadProjectDocs: failed to read ${relPath}: ${err}`);
  }
}

if (parts.length > 0) {
  console.log(
    `<system-reminder>\n# nondominium Project Documentation\n\n${parts.join("\n\n---\n\n")}\n</system-reminder>`
  );
  console.error(`✅ LoadProjectDocs: injected ${parts.length} doc files`);
}

process.exit(0);
