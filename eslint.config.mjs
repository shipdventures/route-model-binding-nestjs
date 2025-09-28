// @ts-check
import eslint from "@eslint/js"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: [
      // This file.
      "eslint.config.mjs",
      // Any build output
      "**/dist",
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-argument": "error",
      // Don't use semi-colons to terminate statements.
      semi: ["error", "never"],
      // Force explicitly stated return types to avoid errors where a function returns 2 different types.
      "@typescript-eslint/explicit-function-return-type": "error",
      // Force public, private, protected to be explicitly stated.
      "@typescript-eslint/explicit-member-accessibility": "error",
      // Ensure promises are handled.
      "@typescript-eslint/no-floating-promises": "error",
      // Allow explicit anys as they are often used in request code e.g. when fetching headers.
      "@typescript-eslint/no-explicit-any": "off",
      // Any prettier issues are a lint error.
      "prettier/prettier": ["error"],
    },
  },
)
