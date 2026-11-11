# config

Configuration shared by every app: validated environment variables and brand
configuration. It is not a feature module and owns no tables.

- `env.ts`: `loadEnv()` validates the environment with Zod at startup and fails fast,
  naming each missing or malformed variable without printing its value (brief section 3.1).
- `brand.ts`: the brand lines and product-family names from brief section 4.0, kept in
  one place so a name can be changed once.

Plan limits, tax tables, schemes and templates are **data**, not constants, and do not
belong here.
