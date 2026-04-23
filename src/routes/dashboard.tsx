import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { generateSlug, isValidSlug, isValidUrl } from "@/lib/slug";
import { Link2, Copy, Trash2, ExternalLink, BarChart3, LogOut, Check } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Snippy" },
      { name: "description", content: "Manage your short links and view click analytics." },
    ],
  }),
  component: Dashboard,
});

type LinkRow = {
  id: string;
  slug: string;
  long_url: string;
  created_at: string;
  click_count: number;
};

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const loadLinks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows, error: linksErr } = await supabase
      .from("links")
      .select("id, slug, long_url, created_at")
      .order("created_at", { ascending: false });

    if (linksErr) {
      setError(linksErr.message);
      setLoading(false);
      return;
    }

    const ids = (rows ?? []).map((r) => r.id);
    let counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: clicks } = await supabase
        .from("clicks")
        .select("link_id")
        .in("link_id", ids);
      for (const c of clicks ?? []) {
        counts.set(c.link_id, (counts.get(c.link_id) ?? 0) + 1);
      }
    }

    setLinks(
      (rows ?? []).map((r) => ({
        ...r,
        click_count: counts.get(r.id) ?? 0,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadLinks();
  }, [user, loadLinks]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!isValidUrl(longUrl)) {
      setError("Enter a valid URL starting with http:// or https://");
      return;
    }
    // Strip leading slashes and take last path segment if user pasted a path
    const rawSlug = customSlug.trim().replace(/^\/+/, "").split("/").pop() ?? "";
    const slug = rawSlug || generateSlug();
    if (!isValidSlug(slug)) {
      setError(
        `Custom slug "${slug}" is invalid. Use 3–32 characters: letters, numbers, _ or - only (no slashes or spaces).`,
      );
      return;
    }

    setCreating(true);
    const { error: insErr } = await supabase
      .from("links")
      .insert({ slug, long_url: longUrl, user_id: user.id });
    setCreating(false);

    if (insErr) {
      if (insErr.code === "23505") {
        setError("That slug is already taken. Try another.");
      } else {
        setError(insErr.message);
      }
      return;
    }
    setLongUrl("");
    setCustomSlug("");
    loadLinks();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("links").delete().eq("id", id);
    if (!error) setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function copyLink(id: string, slug: string) {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Link2 className="h-4 w-4" />
            </div>
            <span className="font-bold">Snippy</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="ml-1.5">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your links</h1>
          <p className="mt-1 text-muted-foreground">
            Create short links and track how many times they're clicked.
          </p>
        </div>

        <Card className="mb-8" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader>
            <CardTitle>Create a new short link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Destination URL</Label>
                <Input
                  id="url"
                  type="url"
                  required
                  placeholder="https://example.com/very/long/url"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Custom slug <span className="text-muted-foreground">(optional)</span>
                </Label>
                <div className="flex items-center gap-2">
                  <span className="hidden truncate text-sm text-muted-foreground sm:inline">
                    {origin}/
                  </span>
                  <Input
                    id="slug"
                    placeholder="my-link"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                {creating ? "Creating..." : "Shorten URL"}
              </Button>
              {error && (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground">Loading links...</p>
          ) : links.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Link2 className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No links yet. Create your first one above.</p>
              </CardContent>
            </Card>
          ) : (
            links.map((link) => (
              <Card key={link.id} style={{ boxShadow: "var(--shadow-card)" }}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/${link.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-semibold text-primary hover:underline"
                      >
                        {origin.replace(/^https?:\/\//, "")}/{link.slug}
                      </a>
                      <Badge variant="secondary" className="shrink-0">
                        <BarChart3 className="mr-1 h-3 w-3" />
                        {link.click_count} {link.click_count === 1 ? "click" : "clicks"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{link.long_url}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(link.id, link.slug)}
                      title="Copy short link"
                    >
                      {copiedId === link.id ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild title="Open">
                      <a href={`/${link.slug}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(link.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
