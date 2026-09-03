import { unstable_cache } from "next/cache";

import { fetchRedditCommunity, RedditConfigError, SUBREDDIT } from "@/lib/reddit";

export const runtime = "nodejs";

const getCachedReddit = unstable_cache(
  fetchRedditCommunity,
  ["reddit", SUBREDDIT],
  { revalidate: 60 },
);

export async function GET() {
  try {
    return Response.json(await getCachedReddit());
  } catch (error) {
    const isConfigError = error instanceof RedditConfigError;
    console.error("Reddit community fetch failed", isConfigError
      ? { name: error.name, message: error.message }
      : { name: "RedditUpstreamError", message: "Upstream Reddit failure" });

    return Response.json(
      { error: "Unable to load Reddit community." },
      { status: isConfigError ? 500 : 502 },
    );
  }
}
