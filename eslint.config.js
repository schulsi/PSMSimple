import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "data/**",
      "Include/**",
      "Lib/**",
      "Scripts/**",
      "share/**",
      ".venv/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["app/static/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        L: "readonly",
        bootstrap: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "warn",
    },
  },
  {
    files: ["frontend/src/**/*.js", "frontend/src/**/*.vue"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-undef": "warn",
    },
  },
];
