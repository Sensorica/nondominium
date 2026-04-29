# nix/cursor-pai.nix
# Generates .cursor/rules/*.mdc files from pai/ source files.
# Called from flake.nix perSystem: (pkgs.callPackage ./nix/cursor-pai.nix { }) { paiDir = ./pai; }
{ lib, runCommand }:
{ paiDir }:

let
  rules = [
    {
      name = "00-telos";
      sourceFile = "TELOS.md";
      alwaysApply = true;
      globs = "";
      description = "Nondominium project purpose and operating principles";
    }
    {
      name = "10-conventions";
      sourceFile = "conventions.md";
      alwaysApply = true;
      globs = "";
      description = "Project coding and design conventions";
    }
    {
      name = "20-architecture";
      sourceFile = "cursor-rules/20-architecture.md";
      alwaysApply = true;
      globs = "";
      description = "Three zome architecture and NDO three-layer model";
    }
    {
      name = "30-rust-zomes";
      sourceFile = "cursor-rules/30-rust-zomes.md";
      alwaysApply = false;
      globs = "**/*.rs";
      description = "Rust zome patterns and HDK conventions";
    }
    {
      name = "40-svelte-ui";
      sourceFile = "cursor-rules/40-svelte-ui.md";
      alwaysApply = false;
      globs = "**/*.svelte";
      description = "Svelte 5 UI patterns with UnoCSS and Melt UI";
    }
    {
      name = "50-tests";
      sourceFile = "cursor-rules/50-tests.md";
      alwaysApply = false;
      globs = "dnas/**/tests/**/*.rs";
      description = "Sweettest patterns and test conventions";
    }
  ];

  mkFrontmatter = { alwaysApply, globs, description, ... }: ''
    ---
    description: ${description}
    globs: ${globs}
    alwaysApply: ${if alwaysApply then "true" else "false"}
    ---

  '';

  mkBuildStep = rule: ''
    {
      printf '%s' ${lib.escapeShellArg (mkFrontmatter rule)}
      cat "${paiDir}/${rule.sourceFile}"
    } > "$out/${rule.name}.mdc"
  '';
in
runCommand "cursor-pai-rules" { } ''
  mkdir -p "$out"
  ${lib.concatMapStrings mkBuildStep rules}
''
