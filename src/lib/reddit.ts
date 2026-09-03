import "server-only";

export const SUBREDDIT = "solana";
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
