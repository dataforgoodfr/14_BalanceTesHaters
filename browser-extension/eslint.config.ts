// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";
import type { Linter } from "eslint";

import { defineConfig, globalIgnores } from "eslint/config";
import configPrettier from "eslint-config-prettier";
import ts from "typescript-eslint";
import react from "@eslint-react/eslint-plugin";
import json from "@eslint/json";
import css from "@eslint/css";
import { tailwind4 } from "tailwind-csstree";
import js from "@eslint/js";

export default defineConfig([
  globalIgnores([
    ".wxt/",
    ".output/",
    ".storybook/",
    "storybook-static",
    "playwright-report",
    "test-results",
    "coverage",
  ]),
  {
    name: "json",
    files: ["**/*.json"],
    ignores: ["package-lock.json"],
    language: "json/json",
    plugins: { json },
    extends: ["json/recommended"],
  },

  {
    name: "css",
    files: ["**/*.css"],
    language: "css/css",
    plugins: { css },
    languageOptions: {
      tolerant: true,
      customSyntax: tailwind4,
    },
    extends: [css.configs.recommended],
    rules: {
      "css/no-invalid-at-rules": "off",
      "css/use-baseline": "off",
      "css/font-family-fallbacks": "off",
    },
  },

  {
    name: "ts",
    files: ["**/*.{ts,tsx,mts,cts}"],
    plugins: { js: js, ts: ts },
    extends: [js.configs.recommended, ts.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    name: "react-ts",
    files: ["src/**/*.{ts,tsx,mts,cts}"],
    plugins: { react: react },
    extends: [react.configs["recommended-type-checked"]],
  },
  {
    name: "@eslint-react/ui-primitives",
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "@eslint-react/no-nested-component-definitions": "off",
      "@eslint-react/no-use-context": "off",
      "@eslint-react/no-context-provider": "off",
      "@eslint-react/dom-no-dangerously-set-innerhtml": "off",
      "@eslint-react/no-array-index-key": "off",
    },
  },

  storybook.configs["flat/recommended"] as Linter.Config,
  /**config prettier goes last */
  configPrettier,
]);
