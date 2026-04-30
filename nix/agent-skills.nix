# nix/agent-skills.nix
# Returns a shellHook fragment that rsyncs agent skills into all three IDE paths:
#   .claude/skills/<name>/   (Claude Code)
#   .cursor/skills/<name>/   (Cursor)
#   .agents/skills/<name>/   (editor-agnostic)
#
# Usage (from flake.nix):
#   agentSkillsHook = pkgs.callPackage ./nix/agent-skills.nix { };
#   # then in shellHook: ${agentSkillsHook skills}
#
# skills :: [ { src : path; name : string; } ]
{ lib }:
skills:
lib.concatMapStrings ({ src, name }: ''
  rsync -a --delete ${src}/ .claude/skills/${name}/
  rsync -a --delete ${src}/ .cursor/skills/${name}/
  rsync -a --delete ${src}/ .agents/skills/${name}/
'') skills
