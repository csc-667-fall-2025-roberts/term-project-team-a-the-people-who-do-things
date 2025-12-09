import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{js,mjs,cjs,ts,tsx}"],
		languageOptions: {
			ecmaVersion: 2020,
			sourceType: "module",
			globals: {
				// Node.js globals
				console: "readonly",
				process: "readonly",
				__dirname: "readonly",
				__filename: "readonly",
				Buffer: "readonly",
				module: "readonly",
				require: "readonly",
				exports: "writable",
				global: "readonly",
				// Browser globals
				window: "readonly",
				document: "readonly",
				navigator: "readonly",
				io: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-empty-function": "warn",

			"no-console": "off", 
			"prefer-const": "warn",
			"no-var": "error",
		},
	},
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"*.config.js",
			"*.config.cjs",
			"*.config.mjs",
			".github/**",
			"public/**",
			"**/*.ejs", 
		],
	},
];
