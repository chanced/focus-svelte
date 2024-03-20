module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:svelte/recommended",
		"prettier",
	],
	plugins: ["@typescript-eslint"],
	ignorePatterns: ["*.cjs"],
	overrides: [
		{
			files: ["*.svelte"],
			parser: "svelte-eslint-parser",
			parserOptions: {
				parser: "@typescript-eslint/parser",
			},
		},
	],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: 2019,
	},
	env: {
		browser: true,
		es2017: true,
		node: true,
	},
};
