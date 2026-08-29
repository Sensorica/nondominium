{
  description = "Flake for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix?ref=main-0.6";

    nixpkgs.follows    = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";

    # Agent skills — plain source trees (not flakes).
    # Pin: set url to "github:owner/repo/vX.Y.Z"
    # Update to latest: nix flake update holochain-agent-skill
    holochain-agent-skill = {
      url   = "github:Soushi888/holochain-agent-skill";
      flake = false;
    };
  };

  outputs = inputs@{ flake-parts, ... }: flake-parts.lib.mkFlake { inherit inputs; } {
    systems = builtins.attrNames inputs.holonix.devShells;
    perSystem = { inputs', pkgs, ... }:
    let
      cursorPAI      = (pkgs.callPackage ./nix/cursor-pai.nix { }) { sharedDir = ./pai/shared; docsDir = ./documentation; };
      agentSkillsHook = pkgs.callPackage ./nix/agent-skills.nix { };
    in
    {
      formatter = pkgs.nixpkgs-fmt;

      devShells.default = pkgs.mkShell {
        inputsFrom = [ inputs'.holonix.devShells.default ];

        packages = (with pkgs; [
          nodejs_22
          binaryen
          bun
          # Required for `holochain` test_utils native compilation (datachannel-sys bindgen)
          llvmPackages_19.libclang
          cmake
          pkg-config
          rsync
        ]);

        shellHook = ''
          export PS1='\[\033[1;34m\][holonix:\w]\$\[\033[0m\] '
          export LIBCLANG_PATH="${pkgs.llvmPackages_19.libclang.lib}/lib"
          export BINDGEN_EXTRA_CLANG_ARGS="-isystem ${pkgs.llvmPackages_19.libclang.lib}/lib/clang/19/include -isystem ${pkgs.glibc.dev}/include"
          git submodule update --init vendor/hrea 2>/dev/null || true

          # Claude adapter: harness-specific source only (settings, hooks).
          # Skills are NOT here — they are harness-agnostic and fan out below.
          # No --delete here: .claude/skills/ is populated by the fan-out below and
          # --delete would wipe it on every shell entry before that runs.
          mkdir -p .claude/skills
          rsync -a ${./pai/harnesses/claude}/ .claude/
          # Nix store paths are read-only, and `rsync -a` preserves that mode on
          # the copy. Without this the NEXT write into .claude/ fails — the skills
          # hook below cannot mkdir .claude/skills/holochain, which is the
          # "Permission denied (13)" rsync error seen on every CI run and in every
          # local nix shell. Same treatment .cursor/ already gets.
          chmod -R u+w .claude 2>/dev/null || true
          chmod u+x .claude/hooks/*.hook.ts 2>/dev/null || true

          # Cursor adapter: pai/shared/ + documentation/ transformed into .mdc
          mkdir -p .cursor/rules
          rsync -a --delete ${cursorPAI}/ .cursor/rules/
          chmod -R u+w .cursor 2>/dev/null || true

          # Harness-agnostic skills, fanned out to every harness path
          mkdir -p .cursor/skills .agents/skills
          ${agentSkillsHook [
            { src = inputs.holochain-agent-skill;                        name = "holochain"; }
            { src = "${./pai/shared}/skills/nondominium-domain"; name = "nondominium-domain"; }
            { src = "${./pai/shared}/skills/complexity-oriented-programming"; name = "complexity-oriented-programming"; }
            { src = "${./pai/shared}/skills/nondominium-review"; name = "nondominium-review"; }
          ]}
        '';
      };
    };
  };
}
