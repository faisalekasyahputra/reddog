import Desktop from "@/components/Desktop";
import { SUBREDDIT } from "@/lib/reddit";

export default function Page() {
  return <Desktop subreddit={SUBREDDIT} />;
}
