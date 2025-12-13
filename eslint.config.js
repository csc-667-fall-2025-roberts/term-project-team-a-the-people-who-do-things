// eslint.config.js
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

// Quality + security
import security from "eslint-plugin-security";
import sonarjs from "eslint-plugin-sonarjs";
import regexp from "eslint-plugin-regexp";
import n from "eslint-plugin-n";
import promise from "eslint-plugin-promise";
import noSecrets from "eslint-plugin-no-secrets";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import tailwindcss from "eslint-plugin-tailwindcss";

// Tests
import jest from "eslint-plugin-jest";

export default tseslint.config(
  // 1) Ignores
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  },

  // 2) Base
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // 3) Server-side TS (Node/Express)
  {
    files: ["server/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      unicorn,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,

      security,
      sonarjs,
      regexp,
      n,
      promise,
      "no-secrets": noSecrets,
    },
    rules: {
      // Auto-fixing
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // TS style
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],

      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",

      // Quality
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/cognitive-complexity": ["warn", 20],

      // Regex footguns
      "regexp/no-super-linear-backtracking": "error",

      // Node correctness
      "n/no-deprecated-api": "warn",

      // Promises
      "promise/catch-or-return": "warn",

      // Security heuristics
      "security/detect-eval-with-expression": "error",
      "security/detect-child-process": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-object-injection": "off", 

      // Secrets
      "no-secrets/no-secrets": ["warn", { tolerance: 4.2 }],
    },
  },

  // 4) Client-side JS 
  {
    files: ["public/**/*.{js,mjs}", "client/**/*.{js,mjs}", "**/*.browser.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    plugins: {
      unicorn,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,

      regexp,
      sonarjs,
      "no-unsanitized": noUnsanitized,
      tailwindcss,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",

      // DOM sink checks 
      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",

      // Tailwind class linting 
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off",

      "sonarjs/no-identical-functions": "warn",
      "regexp/no-super-linear-backtracking": "error",
    },
  },

  // 5) Jest tests (anywhere)
  {
    files: ["**/*.{test,spec}.{js,ts}", "**/__tests__/**/*.{js,ts}"],
    languageOptions: {
      globals: { ...globals.jest },
    },
    plugins: { jest },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },

  // 6) Disable type-checked linting for config files
  {
    files: ["**/*.config.{js,cjs,mjs}", "eslint.config.js", "vite.config.ts"],
    ...tseslint.configs.disableTypeChecked,
  },

  // 7) Prettier last
  prettier
);
