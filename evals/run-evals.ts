import {
  countChecks,
  countFailures,
  evaluateExtraction,
  evaluateFinalization,
  type CheckResult,
  type PhaseResult,
} from "./checks";
import { evalFixtures, type EvalFixture } from "./fixtures";
import type { LivingRecipe, RecipeDraft } from "../src/lib/recipe/types";

type CliOptions = {
  live: boolean;
  baseUrl: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const results: PhaseResult[] = [];

  printHeader(options);

  for (const fixture of evalFixtures) {
    if (options.live) {
      results.push(...(await evaluateLiveFixture(fixture, options.baseUrl)));
    } else {
      results.push(evaluateExtraction(fixture, fixture.expectedExtraction));
      results.push(
        evaluateFinalization(
          fixture,
          fixture.expectedExtraction,
          fixture.followUpAnswers,
          fixture.expectedFinalization,
        ),
      );
    }
  }

  printResults(results);

  const failures = countFailures(results);
  const total = countChecks(results);

  console.log("");
  console.log(`Summary: ${total - failures}/${total} checks passed.`);

  if (failures > 0) {
    process.exitCode = 1;
  }
}

async function evaluateLiveFixture(
  fixture: EvalFixture,
  baseUrl: string,
): Promise<PhaseResult[]> {
  try {
    const draft = await postJson<{ recipeDraft: RecipeDraft }>(
      `${baseUrl}/api/recipes/extract`,
      {
        transcriptSegments: fixture.transcriptSegments,
      },
    );
    const extraction = evaluateExtraction(fixture, draft.recipeDraft);

    const livingRecipe = await postJson<{ livingRecipe: LivingRecipe }>(
      `${baseUrl}/api/recipes/finalize`,
      {
        recipeDraft: draft.recipeDraft,
        transcriptSegments: fixture.transcriptSegments,
        followUpAnswers: fixture.followUpAnswers,
      },
    );
    const finalization = evaluateFinalization(
      fixture,
      draft.recipeDraft,
      fixture.followUpAnswers,
      livingRecipe.livingRecipe,
    );

    return [extraction, finalization];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        phase: "extraction",
        fixtureId: fixture.id,
        fixtureName: fixture.name,
        checks: [
          {
            name: "live API call completed",
            passed: false,
            reasons: [message],
          },
        ],
      },
      {
        phase: "finalization",
        fixtureId: fixture.id,
        fixtureName: fixture.name,
        checks: [
          {
            name: "live API call completed",
            passed: false,
            reasons: [
              "Skipped because extraction/finalization live API call did not complete.",
            ],
          },
        ],
      },
    ];
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(
      `${url} returned ${response.status}: ${JSON.stringify(payload ?? {})}`,
    );
  }

  return payload as T;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    live: false,
    baseUrl: process.env.RECIPETRACE_EVAL_BASE_URL ?? "http://localhost:3000",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--live") {
      options.live = true;
      continue;
    }

    if (arg === "--base-url") {
      const next = args[index + 1];

      if (!next) {
        throw new Error("--base-url requires a URL value.");
      }

      options.baseUrl = next.replace(/\/$/, "");
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHeader(options: CliOptions) {
  console.log("RecipeTrace evals");
  console.log(`Mode: ${options.live ? `live API at ${options.baseUrl}` : "static mocked outputs"}`);
  console.log("");
}

function printResults(results: PhaseResult[]) {
  for (const result of results) {
    const failedChecks = result.checks.filter((check) => !check.passed);
    const status = failedChecks.length === 0 ? "PASS" : "FAIL";

    console.log(`[${status}] ${result.fixtureName} - ${result.phase}`);

    for (const check of result.checks) {
      printCheck(check);
    }

    console.log("");
  }
}

function printCheck(check: CheckResult) {
  console.log(`  ${check.passed ? "PASS" : "FAIL"} ${check.name}`);

  for (const reason of check.reasons) {
    console.log(`    - ${reason}`);
  }
}

function printHelp() {
  console.log(`RecipeTrace eval runner

Usage:
  pnpm evals
  pnpm evals -- --live
  pnpm evals -- --live --base-url http://localhost:3000

Default mode evaluates static mocked outputs so it is fast and free.
Live mode expects the Next app to be running and OPENAI_API_KEY to be configured.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
