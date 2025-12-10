// eslint.config.js
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // 1. Global Ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/public/**",
      "**/.git/**",
    ],
  },

  // 2. Base Configurations
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,

  // 3. Main Configuration Block (For your App Code)
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      unicorn,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
      "interface-to-type": {
        "plugins": ["interface-to-type"]
      }
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

      // Unicorn Rules (Relaxed)
      "unicorn/better-regex": "error",
      "unicorn/prefer-node-protocol": "error",
      "unicorn/prefer-ternary": "error",
      // I DISABLED filename-case to stop the renaming errors
      "unicorn/filename-case": "off", 
      "unicorn/no-lonely-if": "error",

      // Relaxed TS Rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // "@typescript-eslint/consistent-type-definitions": ["error", "type",],
      // "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    },
  },

  // 4. DISABLE Type Checking for Config Files (Fixes Parsing Errors)
  {
    files: ["**/*.config.{js,cjs,mjs,json}", "**/*.js", "**/*.cjs", "vite.config.ts"],
    ...tseslint.configs.disableTypeChecked,
  },

  // 5. Migration Exceptions
  {
    files: ["src/DB/migrations/*.ts"],
    rules: {
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  // 6. Prettier
  prettier
);