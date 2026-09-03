import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export interface ProjectConfig {
  twitter_url: string;
  telegram_url: string;
  community_url: string;
  dexscreener_url: string;
  contract_address: string;
  buy_platform: string;
  chart_platform: string;
  title: string;
  description: string;
  connection_status: string;
}

const BUY_BASE: Record<string, string> = {
  pumpfun: "https://pump.fun/coin/",
  jup: "https://jup.ag/swap/SOL-",
};

export function getBuyUrl(config: Pick<ProjectConfig, "buy_platform" | "contract_address"> | null) {
  if (!config?.buy_platform || !config.contract_address) return null;
  const base = BUY_BASE[config.buy_platform];
  return base ? `${base}${config.contract_address}` : null;
}

export function useProjectConfig() {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("project_configs")
      .select("*, melly_projects!inner(slug)")
      .eq("melly_projects.slug", process.env.NEXT_PUBLIC_PROJECT_SLUG)
      .single()
      .then(({ data, error }) => {
        if (error) console.error("Error fetching config:", error);
        else setConfig(data);
        setLoading(false);
      });
  }, []);

  return { config, loading };
}
