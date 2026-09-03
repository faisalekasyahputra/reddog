import assert from "node:assert/strict";
import test from "node:test";

import { fetchRedditCommunity, shapeRedditData } from "./reddit";

const fetchedAt = "2026-09-04T12:34:56.000Z";
const aboutFixture = {
  data: {
    display_name: "snoofi98",
    title: "Solana",
    public_description: "Solana discussion",
    subscribers: 123,
    accounts_active: 7,
    url: "/r/snoofi98/",
  },
};
const postFixture = {
  id: "abc",
  title: "Hello",
  author: "snoofi",
  score: 10,
  num_comments: 2,
  created_utc: 1234567890,
  permalink: "/r/snoofi98/comments/abc/hello/",
  thumbnail: "self",
};
const listingFixture = { data: { children: [{ data: postFixture }] } };

function assertSafeUpstreamError(error: unknown) {
  assert.deepEqual(
    error instanceof Error ? { name: error.name, message: error.message } : error,
    { name: "RedditUpstreamError", message: "Upstream Reddit failure" },
  );
  return true;
}

async function withRedditFetch(
  fetchMock: typeof globalThis.fetch,
  run: (timeouts: number[]) => Promise<void>,
) {
  const environment = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT"] as const;
  const previousEnvironment = environment.map((name) => process.env[name]);
  const previousFetch = globalThis.fetch;
  const timeoutDescriptor = Object.getOwnPropertyDescriptor(AbortSignal, "timeout");
  const timeouts: number[] = [];

  process.env.REDDIT_CLIENT_ID = "client";
  process.env.REDDIT_CLIENT_SECRET = "secret";
  process.env.REDDIT_USER_AGENT = "reddog-tests/1.0";
  globalThis.fetch = fetchMock;
  Object.defineProperty(AbortSignal, "timeout", {
    configurable: true,
    value: (milliseconds: number) => {
      timeouts.push(milliseconds);
      return new AbortController().signal;
    },
  });

  try {
    await run(timeouts);
  } finally {
    globalThis.fetch = previousFetch;
    if (timeoutDescriptor) Object.defineProperty(AbortSignal, "timeout", timeoutDescriptor);
    environment.forEach((name, index) => {
      const value = previousEnvironment[index];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    });
  }
}

test("shapeRedditData maps valid payloads and preserves optional defaults", () => {
  const about = {
    data: {
      display_name: "snoofi98",
      title: "Solana",
      subscribers: 123,
      url: "/r/snoofi98/",
    },
  };

  assert.deepEqual(shapeRedditData(about, listingFixture, fetchedAt), {
    fetchedAt,
    community: {
      name: "snoofi98",
      title: "Solana",
      description: "",
      subscribers: 123,
      activeUsers: 0,
      url: "https://www.reddit.com/r/snoofi98/",
    },
    posts: [
      {
        id: "abc",
        title: "Hello",
        author: "snoofi",
        score: 10,
        commentCount: 2,
        createdUtc: 1234567890,
        permalink: "https://www.reddit.com/r/snoofi98/comments/abc/hello/",
        thumbnail: null,
      },
    ],
  });
});

test("shapeRedditData rejects malformed fields and unsafe Reddit destinations", () => {
  const cases = [
    {
      name: "empty post id",
      about: aboutFixture,
      listing: { data: { children: [{ data: { ...postFixture, id: "" } }] } },
    },
    {
      name: "non-numeric post score",
      about: aboutFixture,
      listing: { data: { children: [{ data: { ...postFixture, score: "10" } }] } },
    },
    {
      name: "missing community title",
      about: { data: { ...aboutFixture.data, title: "" } },
      listing: listingFixture,
    },
    {
      name: "non-numeric community count",
      about: { data: { ...aboutFixture.data, subscribers: "123" } },
      listing: listingFixture,
    },
    {
      name: "external post permalink",
      about: aboutFixture,
      listing: { data: { children: [{ data: { ...postFixture, permalink: "https://example.com/phish" } }] } },
    },
    {
      name: "external community URL",
      about: { data: { ...aboutFixture.data, url: "https://example.com/r/snoofi98/" } },
      listing: listingFixture,
    },
    {
      name: "protocol-relative external URL",
      about: aboutFixture,
      listing: { data: { children: [{ data: { ...postFixture, permalink: "//example.com/phish" } }] } },
    },
  ];

  for (const invalid of cases) {
    assert.throws(
      () => shapeRedditData(invalid.about, invalid.listing, fetchedAt),
      assertSafeUpstreamError,
      invalid.name,
    );
  }
});

test("fetchRedditCommunity sends the OAuth flow, caps posts, and timestamps the result", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const children = Array.from({ length: 16 }, (_, index) => ({
    data: {
      ...postFixture,
      id: `post-${index}`,
      permalink: index === 1
        ? "https://www.reddit.com/r/snoofi98/comments/post-1/title/"
        : `/r/snoofi98/comments/post-${index}/title/`,
    },
  }));

  await withRedditFetch(async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/api/v1/access_token")) {
      return Response.json({ access_token: "token" });
    }
    if (url.endsWith("/about?raw_json=1")) return Response.json(aboutFixture);
    if (url.endsWith("/hot?limit=15&raw_json=1")) {
      return Response.json({ data: { children } });
    }
    return new Response(null, { status: 404 });
  }, async (timeouts) => {
    const before = Date.now();
    const data = await fetchRedditCommunity();
    const after = Date.now();
    const tokenCall = calls.find(({ url }) => url.endsWith("/api/v1/access_token"));
    const redditCalls = calls.filter(({ url }) => url.startsWith("https://oauth.reddit.com/"));

    assert(tokenCall);
    assert.equal(tokenCall.url, "https://www.reddit.com/api/v1/access_token");
    assert.equal(tokenCall.init?.method, "POST");
    assert.equal(tokenCall.init?.body, "grant_type=client_credentials");
    assert.deepEqual(tokenCall.init?.headers, {
      Authorization: "Basic Y2xpZW50OnNlY3JldA==",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "reddog-tests/1.0",
    });
    assert.deepEqual(redditCalls.map(({ url }) => url).sort(), [
      "https://oauth.reddit.com/r/snoofi98/about?raw_json=1",
      "https://oauth.reddit.com/r/snoofi98/hot?limit=15&raw_json=1",
    ]);
    for (const call of redditCalls) {
      assert.deepEqual(call.init?.headers, {
        Authorization: "Bearer token",
        "User-Agent": "reddog-tests/1.0",
      });
    }
    assert.deepEqual(timeouts, [10_000, 10_000, 10_000]);
    assert.equal(data.posts.length, 15);
    assert.equal(data.posts[0].permalink, "https://www.reddit.com/r/snoofi98/comments/post-0/title/");
    assert.equal(data.posts[1].permalink, "https://www.reddit.com/r/snoofi98/comments/post-1/title/");
    assert.equal(data.community.url, "https://www.reddit.com/r/snoofi98/");
    assert(Date.parse(data.fetchedAt) >= before);
    assert(Date.parse(data.fetchedAt) <= after);
  });
});

test("fetchRedditCommunity hides malformed JSON details before the cache boundary", async () => {
  await withRedditFetch(async () => new Response("<secret raw body>", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }), async () => {
    await assert.rejects(fetchRedditCommunity(), assertSafeUpstreamError);
  });
});

test("fetchRedditCommunity normalizes timeouts", async () => {
  await withRedditFetch(async () => {
    throw new DOMException("private timeout details", "TimeoutError");
  }, async () => {
    await assert.rejects(fetchRedditCommunity(), assertSafeUpstreamError);
  });
});

test("shapeApifyData maps Apify dataset items into RedditData", async () => {
  const { shapeApifyData } = await import("./reddit");
  const data = shapeApifyData([
    { dataType: "community", displayName: "Snoofi Community", description: "desc", numberOfMembers: 12, weeklyActiveUsers: 3, url: "https://www.reddit.com/r/snoofi98/" },
    { dataType: "post", id: "t3_a", title: "hello world", username: "No_Dig_876", upVotes: 5, numberOfComments: 2, createdAt: "2026-09-03T10:00:00.000Z", url: "https://www.reddit.com/r/snoofi98/comments/a/hello_world/" },
  ], "2026-09-04T00:00:00.000Z");
  assert.equal(data.source, "apify");
  assert.equal(data.community.name, "snoofi98");
  assert.equal(data.community.subscribers, 12);
  assert.deepEqual(data.posts.map((p) => [p.title, p.author, p.score, p.commentCount]), [["hello world", "No_Dig_876", 5, 2]]);
  assert.throws(() => shapeApifyData([{ dataType: "post", id: "x", title: "no community", url: "https://www.reddit.com/r/x/" }], "now"));
});

test("subredditFromUrl picks the community out of a reddit link", async () => {
  const { subredditFromUrl } = await import("./reddit");
  assert.equal(subredditFromUrl("https://www.reddit.com/r/solana/"), "solana");
  assert.equal(subredditFromUrl("https://reddit.com/r/Snoofi98"), "Snoofi98");
  assert.equal(subredditFromUrl("https://t.me/snoofi"), null);
  assert.equal(subredditFromUrl(null), null);
});
