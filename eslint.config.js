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
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.git/**",
			"**/*.config.{js,cjs,mjs}",
			"vite.config.ts",
			"vitest.config.ts",
			"vitest.browser.config.ts",
			"jest.config.js",
			"postcss.config.js",
			"coverage/**",
			".vitest/**",
			"**/scripts/**",
			"**/src/DB/migrations/**",
			"**/src/server/pii-check.ts",
			"**/src/server/socket-validators.ts"
		],
	},

	// 2) Base
	js.configs.recommended,

	// 3) JavaScript files (no type checking)
	{
		files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: { ...globals.node },
		},
		plugins: {
			"simple-import-sort": simpleImportSort,
			"unused-imports": unusedImports,
		},
		rules: {
			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",
			"unused-imports/no-unused-imports": "error",
			"no-unused-vars": "warn",
		},
	},

	// 4) TypeScript files
	{
		files: ["**/*.ts", "**/*.tsx"],
		extends: [
			...tseslint.configs.recommended,
		],
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

			// Type safety
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/prefer-nullish-coalescing": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-misused-promises": "off",

			// Quality
			"sonarjs/no-identical-functions": "warn",
			"sonarjs/cognitive-complexity": ["warn", 20],

			// Regex
			"regexp/no-super-linear-backtracking": "error",

			// Node
			"n/no-deprecated-api": "warn",
			"n/no-missing-import": "off",

			// Promises
			"promise/catch-or-return": "warn",

			// Security
			"security/detect-eval-with-expression": "error",
			"security/detect-child-process": "warn",
			"security/detect-non-literal-regexp": "warn",
			"security/detect-non-literal-fs-filename": "warn",
			"security/detect-object-injection": "off",

			// Secrets - Higher tolerance to reduce false positives
			"no-secrets/no-secrets": ["warn", { 
				tolerance: 5.0,
				additionalDelimiters: ["-", "_", "."]
			}],
		},
	},

	// 5) Client-side
	{
		files: [
			"src/public/**/*.{js,mjs,ts}",
			"public/**/*.{js,mjs}",
			"client/**/*.{js,mjs}",
		],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			globals: { ...globals.browser },
		},
		plugins: {
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

			// DOM security
			"no-unsanitized/method": "warn",
			"no-unsanitized/property": "warn",

			// Tailwind
			"tailwindcss/classnames-order": "off", // Too noisy
			"tailwindcss/no-custom-classname": "off",

			// Secrets - Higher tolerance for client code
			"no-secrets/no-secrets": ["warn", { 
				tolerance: 4.5,
				additionalDelimiters: ["-", "_", "."]
			}],

			"sonarjs/no-identical-functions": "warn",
			"regexp/no-super-linear-backtracking": "error",
		},
	},

	// 6) Test files
	{
		files: ["**/*.{test,spec}.{js,ts}", "**/__tests__/**/*.{js,ts}"],
		languageOptions: {
			globals: { ...globals.jest },
		},
		plugins: { jest },
		rules: {
			...jest.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "off",
			"no-secrets/no-secrets": "off", // Disable for tests
		},
	},

	// 7) Disable type-checked linting for config files
	{
		files: [
			"**/*.config.{js,cjs,mjs,ts}",
			"/src/server/pii-check.ts",
			"/src/DB/migrations/",
			"**/src/server/socket-validators.ts"
		],
		...tseslint.configs.disableTypeChecked,
	},

	// 8) Prettier last
	prettier
);
