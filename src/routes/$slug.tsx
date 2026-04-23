import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Button } from "@/components/ui/button";

// Headers commonly used by subscription apps (Happ, v2rayN, Clash, etc.)
// We forward these from the upstream subscription server so apps can read
// expiry, traffic usage, profile name, update interval, etc.
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

function isSubscriptionClient(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  // Common subscription / proxy clients that should get proxied content,
  // not an HTML redirect page.
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

export const Route = createFileRoute("/$slug")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { slug } = params;

        // Look up the link (admin client bypasses RLS for the public lookup)
        const { data: link } = await supabaseAdmin
          .from("links")
          .select("id, long_url")
          .eq("slug", slug)
          .maybeSingle();

        if (!link) {
          // Let the React component render the 404 page for browsers
          return;
        }

        const userAgent = request.headers.get("user-agent");
        const referrer = request.headers.get("referer");

        // Fire-and-forget click logging
        supabaseAdmin
          .from("clicks")
          .insert({
            link_id: link.id,
            referrer: referrer || null,
            user_agent: userAgent || null,
          })
          .then(() => {});

        // For subscription clients: proxy the upstream content with headers
        if (isSubscriptionClient(userAgent)) {
          try {
            const upstream = await fetch(link.long_url, {
              headers: {
                "User-Agent": userAgent || "Snippy/1.0",
                Accept: "*/*",
              },
              redirect: "follow",
            });

            const body = await upstream.arrayBuffer();
            const headers = new Headers();

            for (const name of SUBSCRIPTION_HEADERS) {
              const value = upstream.headers.get(name);
              if (value) headers.set(name, value);
            }
            // Default content-type if upstream didn't provide one
            if (!headers.has("content-type")) {
              headers.set("content-type", "text/plain; charset=utf-8");
            }
            headers.set("cache-control", "no-store");

            return new Response(body, {
              status: upstream.status,
              headers,
            });
          } catch (err) {
            return new Response("Failed to fetch upstream subscription", {
              status: 502,
            });
          }
        }

        // For regular browsers: HTTP redirect (better than client-side)
        return new Response(null, {
          status: 302,
          headers: {
            location: link.long_url,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
  component: SlugRedirect,
});

function SlugRedirect() {
  const { slug } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "notfound" | "redirecting">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("links")
        .select("id, long_url")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setStatus("notfound");
        return;
      }

      setStatus("redirecting");
      window.location.replace(data.long_url);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "notfound") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-7xl font-bold text-foreground">404</h1>
          <h2 className="mt-4 text-xl font-semibold">Link not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The short link <span className="font-mono">/{slug}</span> doesn't exist or has been removed.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
