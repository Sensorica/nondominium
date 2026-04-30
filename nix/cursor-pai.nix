# nix/cursor-pai.nix
# Generates .cursor/rules/*.mdc files from pai/ source files.
# Called from flake.nix perSystem: (pkgs.callPackage ./nix/cursor-pai.nix { }) { paiDir = ./pai; }
{ lib, runCommand }:
{ paiDir, docsDir }:

let
  rules = [
    {
      name = "00-telos";
      dir = docsDir;
      sourceFile = "TELOS.md";
      alwaysApply = true;
      globs = "";
      description = "Nondominium project purpose and operating principles";
    }
    {
      name = "10-conventions";
      dir = paiDir;
      sourceFile = "conventions.md";
      alwaysApply = true;
      globs = "";
      description = "Project coding and design conventions";
    }
    {
      name = "20-architecture";
      dir = paiDir;
      sourceFile = "cursor-rules/20-architecture.md";
      alwaysApply = true;
      globs = "";
      description = "Three zome architecture and NDO three-layer model";
    }
    {
      name = "25-domain-enums";
      dir = paiDir;
      sourceFile = "cursor-rules/10-domain-enums.md";
      alwaysApply = true;
      globs = "";
      description = "Canonical enum reference: PropertyRegime, ResourceNature, LifecycleStage, OperationalState, VfAction, RoleType";
    }
    {
      name = "30-rust-zomes";
      dir = paiDir;
      sourceFile = "cursor-rules/30-rust-zomes.md";
      alwaysApply = false;
      globs = "**/*.rs";
      description = "Rust zome patterns and HDK conventions";
    }
    {
      name = "40-svelte-ui";
      dir = paiDir;
      sourceFile = "cursor-rules/40-svelte-ui.md";
      alwaysApply = false;
      globs = "**/*.svelte";
      description = "Svelte 5 UI patterns with UnoCSS and Melt UI";
    }
    {
      name = "50-tests";
      dir = paiDir;
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
      cat "${rule.dir}/${rule.sourceFile}"
    } > "$out/${rule.name}.mdc"
  '';
in
runCommand "cursor-pai-rules" { } ''
  mkdir -p "$out"
  ${lib.concatMapStrings mkBuildStep rules}
''
