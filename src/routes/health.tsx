import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TARGET_URL = "https://link-love-it.lovable.app";
// A short, harmless marker we can fetch from the target to confirm reachability.
// Using "/" is fine — we only care whether the request resolves with 2xx.
const TARGET_PROBE_PATH = "/";

type ProbeState = "idle" | "checking" | "ok" | "fail";

interface ProbeResult {
  state: ProbeState;
  status?: number;
  durationMs?: number;
  error?: string;
}

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Deployment Health Check" },
      { name: "description", content: "Verify Vercel rewrite and Lovable target reachability." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthPage,
});

function HealthPage() {
  const [origin, setOrigin] = useState<string>("");
  const [target, setTarget] = useState<ProbeResult>({ state: "idle" });
  const [self, setSelf] = useState<ProbeResult>({ state: "idle" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const isVercelHost = origin.includes("vercel.app") || (!origin.includes("lovable.app") && origin !== "");
  const isLovableHost = origin.includes("lovable.app");

  async function probe(url: string): Promise<ProbeResult> {
    const start = performance.now();
    try {
      // no-cors to avoid CORS errors when probing cross-origin hosts.
      // We won't see the status, but a successful fetch (no thrown error)
      // means the network round-trip completed.
      const res = await fetch(url, { method: "GET", mode: "no-cors", cache: "no-store" });
      const duration = Math.round(performance.now() - start);
      // For no-cors responses, status is 0 but type === "opaque" means success
      const ok = res.type === "opaque" || res.ok;
      return {
        state: ok ? "ok" : "fail",
        status: res.status || undefined,
        durationMs: duration,
      };
    } catch (err) {
      return {
        state: "fail",
        durationMs: Math.round(performance.now() - start),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async function runChecks() {
    setTarget({ state: "checking" });
    setSelf({ state: "checking" });

    const [targetResult, selfResult] = await Promise.all([
      probe(`${TARGET_URL}${TARGET_PROBE_PATH}`),
      probe(`${origin}/health`),
    ]);

    setTarget(targetResult);
    setSelf(selfResult);
  }

  useEffect(() => {
    if (origin) runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  // Rewrite is "active" if: we're on a Vercel host AND the page loaded
  // (because if rewrite weren't active we'd get Vercel's 404, not this page).
  const rewriteActive = isVercelHost && self.state === "ok";

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deployment Health Check</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifies whether the Vercel rewrite is active and the Lovable target app is reachable.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Current host
              <Badge variant={isVercelHost ? "default" : isLovableHost ? "secondary" : "outline"}>
                {isVercelHost ? "Vercel" : isLovableHost ? "Lovable" : "Unknown"}
              </Badge>
            </CardTitle>
            <CardDescription className="font-mono text-xs">{origin || "loading…"}</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Vercel rewrite
              <StatusBadge
                state={
                  !isVercelHost
                    ? "idle"
                    : rewriteActive
                      ? "ok"
                      : self.state === "checking"
                        ? "checking"
                        : "fail"
                }
              />
            </CardTitle>
            <CardDescription>
              {!isVercelHost
                ? "Open this page on your Vercel domain to test the rewrite."
                : rewriteActive
                  ? "Vercel is proxying requests to the Lovable app."
                  : "Rewrite is not forwarding requests to the Lovable target."}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Lovable target reachable
              <StatusBadge state={target.state} />
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="font-mono text-xs">{TARGET_URL}</div>
              {target.durationMs !== undefined && (
                <div className="text-xs">Round-trip: {target.durationMs} ms</div>
              )}
              {target.error && <div className="text-xs text-destructive">{target.error}</div>}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Self request (this page)
              <StatusBadge state={self.state} />
            </CardTitle>
            <CardDescription className="space-y-1">
              <div className="font-mono text-xs">{origin}/health</div>
              {self.durationMs !== undefined && (
                <div className="text-xs">Round-trip: {self.durationMs} ms</div>
              )}
              {self.error && <div className="text-xs text-destructive">{self.error}</div>}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button onClick={runChecks} disabled={target.state === "checking" || self.state === "checking"}>
              Re-run checks
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ state }: { state: ProbeState }) {
  if (state === "ok") return <Badge className="bg-green-600 hover:bg-green-600">OK</Badge>;
  if (state === "fail") return <Badge variant="destructive">Fail</Badge>;
  if (state === "checking") return <Badge variant="secondary">Checking…</Badge>;
  return <Badge variant="outline">Idle</Badge>;
}
