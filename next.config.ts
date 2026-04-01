import type { NextConfig } from "next";

/* ------------------------------------------------------------------ */
/*  Derive Supabase storage hostname from env for next/image           */
/*  Handles both local dev (http://127.0.0.1:54321) and production     */
/*  (https://<project>.supabase.co).                                   */
/* ------------------------------------------------------------------ */

function getSupabaseImagePattern(): {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    };
  } catch {
    return null;
  }
}

const supabasePattern = getSupabaseImagePattern();

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      ...(supabasePattern ? [supabasePattern] : []),
    ],
  },
};

export default nextConfig;
