import "server-only";

import { createClient } from "@supabase/supabase-js";

export const SUBREDDIT = "snoofi98";
const REDDIT_URL = "https://www.reddit.com";

export type RedditCommunity = {
  name: string;
  title: string;
  description: string;
  subscribers: number;
  activeUsers: number;
  url: string;
};

export type RedditPost = {
  id: string;
  title: string;
  author: string;
  score: number;
  commentCount: number;
  createdUtc: number;
  permalink: string;
  thumbnail: string | null;
};

export type RedditData = {
  fetchedAt: string;
  source?: "manual" | "apify";
  community: RedditCommunity;
  posts: RedditPost[];
};

export class RedditConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedditConfigError";
  }
}

export class RedditUpstreamError extends Error {
  constructor() {
    super("Upstream Reddit failure");
    this.name = "RedditUpstreamError";
  }
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new RedditUpstreamError();
  return value;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new RedditUpstreamError();
  return value;
}

function optionalNumber(value: unknown): number {
  return value === undefined ? 0 : requiredNumber(value);
}

function redditUrl(value: unknown): string {
  const destination = requiredString(value);

  try {
    const url = destination.startsWith("/") && !destination.startsWith("//")
      ? new URL(destination, REDDIT_URL)
      : new URL(destination);
    if (url.origin !== REDDIT_URL || url.username || url.password) {
      throw new RedditUpstreamError();
    }
    return url.href;
  } catch {
    throw new RedditUpstreamError();
  }
}

function shapePost(value: unknown): RedditPost {
  if (!isRecord(value)) throw new RedditUpstreamError();
  const post = value;
  const thumbnail = stringValue(post.thumbnail);

  return {
    id: requiredString(post.id),
    title: requiredString(post.title),
    author: requiredString(post.author),
    score: requiredNumber(post.score),
    commentCount: requiredNumber(post.num_comments),
    createdUtc: requiredNumber(post.created_utc),
    permalink: redditUrl(post.permalink),
    thumbnail: thumbnail.startsWith("https://") ? thumbnail : null,
  };
}

export function shapeRedditData(about: unknown, listing: unknown, fetchedAt: string): RedditData {
  if (!isRecord(about) || !isRecord(listing) || !isRecord(about.data)) {
    throw new RedditUpstreamError();
  }

  const listingData = listing.data;
  if (!isRecord(listingData) || !Array.isArray(listingData.children)) {
    throw new RedditUpstreamError();
  }

  const community = about.data;
  const posts = listingData.children.slice(0, 15).map((child) =>
    shapePost(isRecord(child) ? child.data : undefined),
  );
  if (new Set(posts.map(({ id }) => id)).size !== posts.length) {
    throw new RedditUpstreamError();
  }

  return {
    fetchedAt,
    community: {
      name: requiredString(community.display_name),
      title: requiredString(community.title),
      description: stringValue(community.public_description),
      subscribers: optionalNumber(community.subscribers),
      activeUsers: optionalNumber(community.accounts_active),
      url: redditUrl(community.url),
    },
    posts,
  };
}

export async function fetchRedditCommunity(): Promise<RedditData> {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const userAgent = process.env.REDDIT_USER_AGENT;

    if (!clientId || !clientSecret || !userAgent) {
      throw new RedditConfigError("Missing Reddit configuration");
    }

    const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10_000),
    });

    if (!tokenResponse.ok) throw new RedditUpstreamError();

    const tokenPayload: unknown = await tokenResponse.json();
    if (!isRecord(tokenPayload)) throw new RedditUpstreamError();

    const headers = {
      Authorization: `Bearer ${requiredString(tokenPayload.access_token)}`,
      "User-Agent": userAgent,
    };
    const subreddit = encodeURIComponent(SUBREDDIT);
    const [aboutResponse, listingResponse] = await Promise.all([
      fetch(`https://oauth.reddit.com/r/${subreddit}/about?raw_json=1`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(`https://oauth.reddit.com/r/${subreddit}/hot?limit=15&raw_json=1`, {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
    ]);

    if (!aboutResponse.ok || !listingResponse.ok) throw new RedditUpstreamError();

    const [about, listing] = await Promise.all([
      aboutResponse.json(),
      listingResponse.json(),
    ]);
    return shapeRedditData(about, listing, new Date().toISOString());
  } catch (error) {
    if (error instanceof RedditConfigError) throw error;
    throw new RedditUpstreamError();
  }
}

// ponytail: Apify "last run" dataset -> RedditData. Scheduled on Apify (every 3h), so this read is instant and costs nothing.
export function shapeApifyData(items: unknown, fetchedAt: string): RedditData {
  if (!Array.isArray(items)) throw new RedditUpstreamError();
  const records = items.filter(isRecord);
  const community = records.find((item) => item.dataType === "community");
  if (!community) throw new RedditUpstreamError();

  const posts = records
    .filter((item) => item.dataType === "post")
    .slice(0, 15)
    .map((post): RedditPost => ({
      id: requiredString(post.id),
      title: requiredString(post.title),
      author: stringValue(post.username) || "[deleted]",
      score: optionalNumber(post.upVotes),
      commentCount: optionalNumber(post.numberOfComments),
      createdUtc: Math.floor(Date.parse(stringValue(post.createdAt)) / 1000) || 0,
      permalink: redditUrl(post.url),
      thumbnail: null,
    }));

  const url = redditUrl(community.url);
  return {
    fetchedAt,
    source: "apify",
    community: {
      name: url.split("/r/")[1]?.split("/")[0] || SUBREDDIT,
      title: requiredString(community.displayName ?? community.title),
      description: stringValue(community.description),
      subscribers: optionalNumber(community.numberOfMembers),
      activeUsers: optionalNumber(community.weeklyActiveUsers),
      url,
    },
    posts,
  };
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new RedditConfigError("Missing Supabase configuration");
  return createClient(url, key, { auth: { persistSession: false } });
}

export const FEED_KEY = process.env.NEXT_PUBLIC_PROJECT_SLUG ?? SUBREDDIT;

// Called by the Apify webhook: pull the finished run's dataset, shape it, store one row per project.
export async function ingestApifyDataset(datasetId: string): Promise<RedditData> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new RedditConfigError("Missing Apify configuration");
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?format=json`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) },
  );
  if (!response.ok) throw new RedditUpstreamError();
  const data = shapeApifyData(await response.json(), new Date().toISOString());
  const { error } = await supabaseAdmin()
    .from("reddit_feeds")
    .upsert({ project_slug: FEED_KEY, data, updated_at: data.fetchedAt });
  if (error) throw new RedditUpstreamError();
  return data;
}

export async function fetchStoredCommunity(): Promise<RedditData> {
  const { data, error } = await supabaseAdmin()
    .from("reddit_feeds")
    .select("data")
    .eq("project_slug", FEED_KEY)
    .maybeSingle();
  if (error) throw new RedditUpstreamError();
  if (!data) throw new RedditConfigError("No stored feed yet");
  return data.data as RedditData;
}

// ponytail: the admin panel has no reddit field, so a reddit.com/r/<name> link in telegram_url selects the community.
export function subredditFromUrl(value: unknown): string | null {
  const match = typeof value === "string" ? /reddit\.com\/r\/([A-Za-z0-9_]+)/i.exec(value) : null;
  return match ? match[1] : null;
}

export async function configuredSubreddit(): Promise<string> {
  const { data } = await supabaseAdmin()
    .from("project_configs")
    .select("telegram_url, melly_projects!inner(slug)")
    .eq("melly_projects.slug", FEED_KEY)
    .maybeSingle();
  return subredditFromUrl(data?.telegram_url) ?? SUBREDDIT;
}

// Point the Apify task at `name` and start it, so the next webhook stores the right community.
export async function resyncApifyTask(name: string): Promise<void> {
  const token = process.env.APIFY_TOKEN;
  const taskId = process.env.APIFY_TASK_ID;
  if (!token || !taskId) throw new RedditConfigError("Missing Apify configuration");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `https://api.apify.com/v2/actor-tasks/${encodeURIComponent(taskId)}`;
  const sub = encodeURIComponent(name);
  const input = await fetch(`${base}/input`, { headers, signal: AbortSignal.timeout(10_000) }).then((r) => r.json());
  const updated = await fetch(`${base}/input`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      ...input,
      startUrls: [{ url: `https://www.reddit.com/r/${sub}/` }, { url: `https://www.reddit.com/r/${sub}/hot/` }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!updated.ok) throw new RedditUpstreamError();
  const started = await fetch(`${base}/runs`, { method: "POST", headers, signal: AbortSignal.timeout(10_000) });
  if (!started.ok) throw new RedditUpstreamError();
}

export function fetchCommunity(): Promise<RedditData> {
  return process.env.REDDIT_CLIENT_ID ? fetchRedditCommunity() : fetchStoredCommunity();
}
