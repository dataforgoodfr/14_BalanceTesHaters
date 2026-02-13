import { defineConfig, globalIgnores } from "eslint/config";
import eslint from "@eslint/js";
import configPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";

export default defineConfig([
  globalIgnores([".wxt/", ".output/"]),
  configPrettier,
  eslint.configs.recommended,
  markdown.configs.processor,
  tseslint.configs.recommended,
  {
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
    },
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: { react: pluginReact },
  },
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  json.configs.recommended,
  //markdown.configs.recommended,
  css.configs.recommended,
]);
