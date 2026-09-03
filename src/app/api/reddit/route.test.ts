import assert from "node:assert/strict";
import test from "node:test";

import { RedditConfigError } from "@/lib/reddit";

async function getWithCacheError(error: Error) {
  const globals = globalThis as typeof globalThis & { __incrementalCache?: unknown };
  const previousCache = globals.__incrementalCache;
  const previousConsoleError = console.error;
  const logs: unknown[][] = [];

  globals.__incrementalCache = {
    generateSimpleCacheKey: async (key: string) => key,
    get: async () => { throw error; },
    isOnDemandRevalidate: false,
    set: async () => undefined,
  };
  console.error = (...args) => { logs.push(args); };

  try {
    const { GET } = await import("./route");
    return { response: await GET(), logs };
  } finally {
    console.error = previousConsoleError;
    if (previousCache === undefined) delete globals.__incrementalCache;
    else globals.__incrementalCache = previousCache;
  }
}

test("GET serves the manual feed when Reddit is not configured", async () => {
  const { response } = await getWithCacheError(
    new RedditConfigError("Missing Reddit configuration"),
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, "manual");
  assert.equal(body.community.name, "snoofi98");
});

test("GET never logs raw upstream error content", async () => {
  const { response, logs } = await getWithCacheError(
    new SyntaxError("Unexpected token '<', \"<secret raw body>\" is not valid JSON"),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    error: "Unable to load Reddit community.",
  });
  assert.deepEqual(logs, [[
    "Reddit community fetch failed",
    { name: "RedditUpstreamError", message: "Upstream Reddit failure" },
  ]]);
});
