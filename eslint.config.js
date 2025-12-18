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

	// 2) Base
	js.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.stylisticTypeChecked,

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

			"simple-import-sort/imports": "error",
			"simple-import-sort/exports": "error",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-misused-promises": "off",
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
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					prefer: "type-imports",
					fixStyle: "separate-type-imports",
					disallowTypeAnnotations: false,
				},
			],
			"@typescript-eslint/consistent-type-exports": [
				"error",
				{
					fixMixedExportsWithInlineTypeSpecifier: true,
				},
			],
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-unsafe-call": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",
			"@typescript-eslint/prefer-nullish-coalescing": "warn",
			"@typescript-eslint/strict-boolean-expressions": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: {
						attributes: false,
					},
				},
			],


			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "typeLike",
					format: ["PascalCase"],
				},
				{
					selector: "interface",
					format: ["PascalCase"],
					custom: {
						regex: "^I[A-Z]",
						match: false,
					},
				},
				{
					selector: "typeAlias",
					format: ["PascalCase"],
					suffix: ["Data", "Response", "Request", "Schema", "Type", "Config"],
					custom: {
						regex: "^T[A-Z]",
						match: false,
					},
				},
			],

			"no-restricted-syntax": [
				"error",
				{
					selector: "CallExpression[callee.property.name='emit'][arguments.0.type='Literal']:not(:has(VariableDeclarator[id.typeAnnotation]))",
					message: "Socket events should be typed. Import event types from socket-events.ts",
				},
				{
					selector: "CallExpression[callee.object.name='socket'][callee.property.name='emit'] > ObjectExpression:last-child:not(:has(Property[key.name='game_ID'])):not(:has(Property[key.name='user_ID']))",
					message: "Use snake_case with capitals for database fields: game_ID, user_ID (not gameId, userId)",
				},
			],

			
			"@typescript-eslint/no-unsafe-enum-comparison": "off",

	
			"sonarjs/no-identical-functions": "warn",
			"sonarjs/cognitive-complexity": ["warn", 20],
			"sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],

			"regexp/no-super-linear-backtracking": "error",
			"regexp/no-unused-capturing-group": "warn",

			"n/no-deprecated-api": "warn",
			"n/no-missing-import": "off", // TypeScript handles this

			"promise/catch-or-return": "warn",
			"promise/always-return": "off",
			"promise/no-return-wrap": "error",

			"security/detect-eval-with-expression": "error",
			"security/detect-child-process": "warn",
			"security/detect-non-literal-regexp": "warn",
			"security/detect-non-literal-fs-filename": "warn",
			"security/detect-object-injection": "off",
			"no-secrets/no-secrets": ["warn", { tolerance: 4.2 }],

			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": ["error", "always"],
			"prefer-template": "error",
			"prefer-arrow-callback": "error",
		},
	},

	// 4) Client-side JS/TS
	{
		files: [
			"public/**/*.{js,mjs,ts}",
			"client/**/*.{js,mjs,ts}",
			"src/public/**/*.{js,mjs,ts}",
			"**/*.browser.{js,mjs,ts}",
		],
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

		
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					prefer: "type-imports",
					fixStyle: "separate-type-imports",
				},
			],

			"no-unsanitized/method": "warn",
			"no-unsanitized/property": "warn",

	
			"tailwindcss/classnames-order": "warn",
			"tailwindcss/no-custom-classname": "off",
			"tailwindcss/enforces-negative-arbitrary-values": "warn",
			"tailwindcss/enforces-shorthand": "warn",

		
			"no-restricted-syntax": [
				"error",
				{
					selector: "CallExpression[callee.property.name='emit'][arguments.0.type='ObjectExpression']",
					message: "Avoid emitting raw object literals. Use typed socket events from socket-events.ts and sanitize PII (email, password, password_hash, user_ID)",
				},
				{
					selector: "CallExpression[callee.property.name='emit'][arguments.1.type='ObjectExpression']",
					message: "Avoid emitting raw object literals. Use typed socket events from socket-events.ts and sanitize PII (email, password, password_hash, user_ID)",
				},
				{
					selector: "CallExpression[callee.object.name='socket'][callee.property.name='emit'] > ObjectExpression:has(Property[key.name='user_id'])",
					message: "Use user_ID (snake_case with capitals) instead of user_id for database field consistency",
				},
				{
					selector: "CallExpression[callee.object.name='socket'][callee.property.name='emit'] > ObjectExpression:has(Property[key.name='game_id'])",
					message: "Use game_ID (snake_case with capitals) instead of game_id for database field consistency",
				},
			],

		
			"no-secrets/no-secrets": ["warn", { tolerance: 2.0 }],

			"sonarjs/no-identical-functions": "warn",
			"regexp/no-super-linear-backtracking": "error",
		},
	},


	{
		files: ["**/socket-validators.{ts,js}", "**/validators/**/*.{ts,js}"],
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/explicit-function-return-type": "error",
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/strict-boolean-expressions": "error",
		},
	},

	{
		files: ["**/*.d.ts", "**/types/**/*.ts"],
		rules: {
			"@typescript-eslint/consistent-type-definitions": ["error", "type"],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: "typeAlias",
					format: ["PascalCase"],
				},
				{
					selector: "interface",
					format: ["PascalCase"],
					custom: {
						regex: "^I[A-Z]",
						match: false,
					},
				},
			],
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
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-explicit-any": "off",
		},
	},

	// 8) Disable type-checked linting for config files
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

	// 9) Prettier last (disables conflicting rules)
	prettier
);