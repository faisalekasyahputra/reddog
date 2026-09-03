import { revalidateTag } from "next/cache";

import { configuredSubreddit, ingestApifyDataset, resyncApifyTask } from "@/lib/reddit";

export const runtime = "nodejs";

// Apify webhook target (ACTOR.RUN.SUCCEEDED). Secret in the URL keeps random callers out.
export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.APIFY_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload: unknown = await request.json().catch(() => null);
  const datasetId = (payload as { resource?: { defaultDatasetId?: unknown } } | null)?.resource?.defaultDatasetId;
  if (typeof datasetId !== "string" || !datasetId) {
    return Response.json({ error: "Missing datasetId" }, { status: 400 });
  }

  try {
    const data = await ingestApifyDataset(datasetId);
    revalidateTag("reddit", "max");
    // Admin changed the community since this run started: retarget the task and rerun right away.
    const wanted = await configuredSubreddit();
    if (wanted.toLowerCase() !== data.community.name.toLowerCase()) {
      await resyncApifyTask(wanted);
      return Response.json({ ok: true, posts: data.posts.length, fetchedAt: data.fetchedAt, resyncTo: wanted });
    }
    return Response.json({ ok: true, posts: data.posts.length, fetchedAt: data.fetchedAt });
  } catch (error) {
    console.error("Reddit ingest failed", { name: error instanceof Error ? error.name : "Error" });
    return Response.json({ error: "Ingest failed" }, { status: 502 });
  }
}
