import js from "@eslint/js"
import nextPlugin from "@next/eslint-plugin-next"
import prettier from "eslint-config-prettier"
import reactHooks from "eslint-plugin-react-hooks"
import globals from "globals"
import tseslint from "typescript-eslint"

// Phosphor is the only icon library (brief section 4.1). Any other icon package fails the build.
const BANNED_ICON_IMPORTS = [
  "lucide-react",
  "@tabler/icons-react",
  "@hugeicons/*",
  "hugeicons-react",
  "react-icons",
  "react-icons/*",
  "@heroicons/*",
  "@radix-ui/react-icons",
  "@remixicon/react",
  "react-feather",
]

const NEXT_APPS = ["apps/web/**/*.{ts,tsx}", "apps/admin/**/*.{ts,tsx}"]

// Files written by the shadcn CLI. We do not hand-edit them (brief section 4.2),
// so rules they cannot meet as generated are relaxed here and nowhere else.
const SHADCN_GENERATED = ["packages/ui/src/components/**/*.tsx"]

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/next-env.d.ts",
      "akoso-refs/**",
      ".agents/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: BANNED_ICON_IMPORTS,
              message:
                "Use Phosphor icons only (@phosphor-icons/react), through the Icon component in @akoso/ui/akoso/icon.",
            },
          ],
        },
      ],
    },
  },
  {
    files: NEXT_APPS,
    plugins: { "@next/next": nextPlugin },
    settings: { next: { rootDir: ["apps/web/", "apps/admin/"] } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    files: [...NEXT_APPS, "packages/ui/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: SHADCN_GENERATED,
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: { ...globals.node },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // Plain JavaScript has no type annotations, so this rule cannot be met there.
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },
  prettier
)
