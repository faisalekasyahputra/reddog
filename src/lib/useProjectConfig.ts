import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";


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

// ponytail: launched on PONS, so buy always goes to the PONS launchpad; buy_platform is ignored
export function getBuyUrl(config: Pick<ProjectConfig, "contract_address"> | null) {
  return config?.contract_address ? `https://ponsfamily.com/launchpad/${config.contract_address}` : null;
}

export function useProjectConfig() {
  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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
