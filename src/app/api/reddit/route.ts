import { unstable_cache } from "next/cache";

import manualFeed from "@/lib/reddit-manual.json";
import { fetchCommunity, RedditConfigError, SUBREDDIT } from "@/lib/reddit";

export const runtime = "nodejs";

const getCachedReddit = unstable_cache(
  fetchCommunity,
  ["reddit", SUBREDDIT],
  { revalidate: 60, tags: ["reddit"] },
);

export async function GET() {
  try {
    return Response.json(await getCachedReddit());
  } catch (error) {
    // ponytail: neither Reddit OAuth nor Apify configured -> hand-maintained feed
    if (error instanceof RedditConfigError) return Response.json(manualFeed);
    console.error("Reddit community fetch failed", { name: "RedditUpstreamError", message: "Upstream Reddit failure" });

    return Response.json({ error: "Unable to load Reddit community." }, { status: 502 });
  }
}
