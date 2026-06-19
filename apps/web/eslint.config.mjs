import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextConfig,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // async fetch-then-setState is a common pattern; the rule over-fires here
      "react-hooks/set-state-in-effect": "warn",
      // Date.now() in memoization hooks is flagged as impure; acceptable here
      "react-hooks/purity": "warn",
      // useMemo wrapping existing derived values; not blocking
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];
