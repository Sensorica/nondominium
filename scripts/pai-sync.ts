#!/usr/bin/env bun
/**
 * pai-sync — fast inner loop for editing pai/.
 *
 * `nix develop` is the authority: it owns the pinned flake inputs, it is what CI
 * runs, and it is the only thing that can resolve an external skill source. This
 * script is NOT a second source of truth. It exists for one reason: nix flakes
 * only see git-tracked files, so a newly created skill silently does not appear
 * until it is committed. That is a confusing first ten minutes for anyone adding
 * one, because nothing errors, the skill is simply never invoked.
 *
 * This copies the harness-agnostic sources straight from the working tree, so an
 * uncommitted edit shows up immediately. It deliberately does NOT touch anything
 * that comes from a flake input (the `holochain` skill), because reproducing that
 * without nix would mean guessing at a pinned revision.
 *
 * Run `nix develop` before trusting the result. This is for iteration; that is
 * for correctness.
 */
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Nix store paths are read-only and `rsync -a` preserves that mode on the copy,
 * so anything a previous `nix develop` materialized arrives non-writable. Removing
 * or overwriting it then fails with EACCES. flake.nix works around this with
 * `chmod -R u+w`; this is the same fix, and it has to happen before any write.
 */
function makeWritable(path: string): void {
  if (!existsSync(path)) return;
  const entry = statSync(path);
  chmodSync(path, entry.mode | 0o200);
  if (!entry.isDirectory()) return;
  for (const child of readdirSync(path)) makeWritable(join(path, child));
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sharedSkills = join(repoRoot, "pai", "shared", "skills");
const harnessSkillPaths = [".claude/skills", ".cursor/skills", ".agents/skills"];

if (!existsSync(sharedSkills)) {
  console.error(`pai-sync: no such directory: ${sharedSkills}`);
  process.exit(1);
}

const skills = readdirSync(sharedSkills, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

if (skills.length === 0) {
  console.error("pai-sync: pai/shared/skills/ is empty, nothing to sync");
  process.exit(1);
}

for (const target of harnessSkillPaths) {
  for (const skill of skills) {
    const dest = join(repoRoot, target, skill);
    makeWritable(dest);
    // Mirror rsync --delete: a file removed from the source should not survive.
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(sharedSkills, skill), dest, { recursive: true });
    makeWritable(dest);
  }
}

console.log(
  `pai-sync: ${skills.length} skill(s) -> ${harnessSkillPaths.join(", ")}\n` +
    `  ${skills.join(", ")}\n` +
    `  Skills from flake inputs are untouched; run \`nix develop\` for those.`,
);
