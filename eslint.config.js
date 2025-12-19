// eslint.config.js
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jest from "eslint-plugin-jest";
import n from "eslint-plugin-n";
import noSecrets from "eslint-plugin-no-secrets";
import noUnsanitized from "eslint-plugin-no-unsanitized";
import promise from "eslint-plugin-promise";
import regexp from "eslint-plugin-regexp";
import security from "eslint-plugin-security";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import sonarjs from "eslint-plugin-sonarjs";
import tailwindcss from "eslint-plugin-tailwindcss";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**",
      "**/*.config.{js,cjs,mjs}",
      "eslint.config.js",
      "vite.config.ts",
      "jest.config.js",
      "postcss.config.js",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
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
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",

      "sonarjs/no-identical-functions": "warn",
      "sonarjs/cognitive-complexity": ["warn", 20],

      "regexp/no-super-linear-backtracking": "error",

      "n/no-deprecated-api": "warn",

      "promise/catch-or-return": "warn",

      "security/detect-eval-with-expression": "error",
      "security/detect-child-process": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-object-injection": "off",

      "no-secrets/no-secrets": ["warn", { tolerance: 4.2 }],
    },
  },

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
      "no-secrets": noSecrets,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "unused-imports/no-unused-imports": "error",

      "no-unsanitized/method": "warn",
      "no-unsanitized/property": "warn",

      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off",

      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='emit'][arguments.0.type='ObjectExpression']",
          message:
            "Avoid emitting raw object literals through socket.emit on the client. Sanitize and remove PII fields (email, password, displayName, password_hash, user_id) before emitting.",
        },
        {
          selector:
            "CallExpression[callee.property.name='emit'][arguments.1.type='ObjectExpression']",
          message:
            "Avoid emitting raw object literals through socket.emit on the client. Sanitize and remove PII fields (email, password, displayName, password_hash, user_id) before emitting.",
        },
      ],

      "no-secrets/no-secrets": ["warn", { tolerance: 2.0 }],

      "sonarjs/no-identical-functions": "warn",
      "regexp/no-super-linear-backtracking": "error",
    },
  },
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
  {
    files: [
      "**/*.config.{js,cjs,mjs}",
      "eslint.config.js",
      "vite.config.ts",
      "jest.config.js",
      "postcss.config.js",
    ],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
