# RecipeTrace Evals

Lightweight TypeScript evals for checking that RecipeTrace behaves like a
trustworthy cooking knowledge system instead of a generic recipe generator.

Run static mocked outputs first:

```bash
pnpm evals
```

Run against live local API routes:

```bash
pnpm dev
pnpm evals -- --live
```

Live mode expects `OPENAI_API_KEY` to be configured and posts each transcript
fixture to:

- `POST /api/recipes/extract`
- `POST /api/recipes/finalize`

Use a non-default server URL with:

```bash
pnpm evals -- --live --base-url http://localhost:3001
```

The suite intentionally has no database dependency and no test framework. Each
check returns pass/fail reasons so failures stay readable.
