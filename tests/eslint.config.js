import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Base configuration for all files
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        // Node.js globals
        global: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        console: "readonly",
        // Test globals (Vitest)
        test: "readonly",
        expect: "readonly",
        describe: "readonly",
        it: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
        // Performance API
        performance: "readonly",
      },
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,

      // Basic TypeScript rules (avoiding the full recommended config that has issues)
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Additional helpful rules for Holochain testing
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-var-requires": "off", // Sometimes needed for dynamic imports

      // Allow console in test files
      "no-console": "off",

      // Disable some conflicting rules
      "no-undef": "off", // TypeScript handles this
      "no-unused-vars": "off", // Use @typescript-eslint version instead

      // Enforce consistent formatting
      quotes: ["warn", "double", { avoidEscape: true }],
      semi: ["warn", "always"],
    },
  },

  // Specific configuration for test files
  {
    files: ["**/*.test.{js,ts}", "**/tests/**/*.{js,ts}"],
    rules: {
      // More lenient rules for test files
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      quotes: "off", // Allow both single and double quotes in tests

      // Allow unused variables in test files for setup/teardown
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern:
            "^(scenario|lynn|bob|charlie|context|decode|pause|CallableCell|Record|ActionHash|AgentPubKey|HolochainRecord|Link|dhtSync|profiler|ppr_result)",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Configuration for common.ts utility files
  {
    files: ["**/common.ts"],
    rules: {
      // Allow any types in utility functions
      "@typescript-eslint/no-explicit-any": "off",
      quotes: "off", // Allow both single and double quotes in utility files

      // Allow unused imports in common files (they're often used by importing tests)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern:
            "^(ActionHash|HolochainRecord|AgentPubKey|Link|PersonRole|GetPersonRolesOutput|CryptographicSignature|ParticipationReceiptInput|SignParticipationClaimInput|ValidateSignatureInput|GetParticipationClaimsInput|maxConcurrency)",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Allow longer functions in utility files
      "max-lines-per-function": "off",
    },
  },

  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.d.ts",
      "coverage/**",
    ],
  },
];
