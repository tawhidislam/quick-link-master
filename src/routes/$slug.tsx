import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/$slug")({
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

      // Fire-and-forget click log
      supabase
        .from("clicks")
        .insert({
          link_id: data.id,
          referrer: typeof document !== "undefined" ? document.referrer || null : null,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        })
        .then(() => {});

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
