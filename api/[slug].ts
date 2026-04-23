// Vercel serverless function: handles short-link resolution
// Routes:
//   GET /<slug>  -> proxy subscription content OR 302 redirect
//
// Configured via vercel.json rewrites so that any single-segment path
// that isn't a real asset/route gets sent here.

import { createClient } from "@supabase/supabase-js";

export const config = {
  // Use Node.js runtime so we have full fetch + Buffer support
  runtime: "nodejs",
};

const SUBSCRIPTION_HEADERS = [
  "subscription-userinfo",
  "profile-update-interval",
  "profile-title",
  "profile-web-page-url",
  "support-url",
  "announce",
  "content-disposition",
  "content-type",
];

function isSubscriptionClient(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes("happ") ||
    ua.includes("v2ray") ||
    ua.includes("clash") ||
    ua.includes("shadowrocket") ||
    ua.includes("sing-box") ||
    ua.includes("singbox") ||
    ua.includes("streisand") ||
    ua.includes("nekobox") ||
    ua.includes("nekoray") ||
    ua.includes("hiddify") ||
    ua.includes("flclash") ||
    ua.includes("stash") ||
    ua.includes("loon") ||
    ua.includes("quantumult") ||
    ua.includes("surge") ||
    ua.includes("v2box") ||
    ua.includes("karing") ||
    ua.includes("mihomo") ||
    ua.includes("subconverter")
  );
}

// Reserved paths that should NOT be treated as slugs (let SPA handle them)
const RESERVED = new Set(["", "auth", "dashboard", "favicon.ico", "robots.txt"]);

export default async function handler(req: any, res: any) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const SUPABASE_ANON_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain");
      res.end("Server misconfigured: missing Supabase env vars");
      return;
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Vercel passes dynamic segment in req.query.slug
    let slug = (req.query?.slug as string) || "";
    if (Array.isArray(slug)) slug = slug[0] || "";
    slug = slug.trim();

    if (!slug || RESERVED.has(slug)) {
      // Fall through to SPA index
      res.statusCode = 404;
      res.setHeader("content-type", "text/plain");
      res.end("Not found");
      return;
    }

    const { data: link } = await supabase
      .from("links")
      .select("id, long_url")
      .eq("slug", slug)
      .maybeSingle();

    if (!link) {
      res.statusCode = 404;
      res.setHeader("content-type", "text/plain");
      res.end("Short link not found");
      return;
    }

    const userAgent =
      (req.headers["user-agent"] as string | undefined) || null;
    const referrer =
      (req.headers["referer"] as string | undefined) ||
      (req.headers["referrer"] as string | undefined) ||
      null;

    // Fire-and-forget click logging
    supabase
      .from("clicks")
      .insert({
        link_id: link.id,
        referrer: referrer,
        user_agent: userAgent,
      })
      .then(() => {});

    // Subscription clients: proxy upstream with headers
    if (isSubscriptionClient(userAgent)) {
      try {
        const upstream = await fetch(link.long_url, {
          headers: {
            "User-Agent": userAgent || "Snippy/1.0",
            Accept: "*/*",
          },
          redirect: "follow",
        });

        const buf = Buffer.from(await upstream.arrayBuffer());

        for (const name of SUBSCRIPTION_HEADERS) {
          const value = upstream.headers.get(name);
          if (value) res.setHeader(name, value);
        }
        if (!res.getHeader("content-type")) {
          res.setHeader("content-type", "text/plain; charset=utf-8");
        }
        res.setHeader("cache-control", "no-store");
        res.statusCode = upstream.status;
        res.end(buf);
        return;
      } catch (err) {
        res.statusCode = 502;
        res.setHeader("content-type", "text/plain");
        res.end("Failed to fetch upstream subscription");
        return;
      }
    }

    // Browsers: 302 redirect
    res.statusCode = 302;
    res.setHeader("location", link.long_url);
    res.setHeader("cache-control", "no-store");
    res.end();
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader("content-type", "text/plain");
    res.end("Internal error: " + (err?.message || String(err)));
  }
}
