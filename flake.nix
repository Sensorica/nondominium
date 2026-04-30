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
      cursorPAI      = (pkgs.callPackage ./nix/cursor-pai.nix { }) { paiDir = ./pai; docsDir = ./documentation; };
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

          # Materialize .claude/ from pai/claude/
          mkdir -p .claude/skills
          rsync -a --delete ${./pai/claude}/ .claude/
          chmod u+x .claude/hooks/*.hook.ts 2>/dev/null || true

          # Materialize Cursor rules from pai/
          mkdir -p .cursor/rules
          rsync -a --delete ${cursorPAI}/ .cursor/rules/
          chmod -R u+w .cursor 2>/dev/null || true

          # Materialize agent skills into .claude/, .cursor/, and .agents/
          mkdir -p .cursor/skills .agents/skills
          ${agentSkillsHook [
            { src = inputs.holochain-agent-skill;                        name = "holochain"; }
            { src = "${./pai/claude}/skills/nondominium-domain"; name = "nondominium-domain"; }
          ]}
        '';
      };
    };
  };
}
