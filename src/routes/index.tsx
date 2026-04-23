import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Link2, Zap, BarChart3, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Snippy — Beautiful short links with click analytics" },
      {
        name: "description",
        content:
          "Create custom short links in seconds and track every click. Free, fast, and built for makers.",
      },
      { property: "og:title", content: "Snippy — Beautiful short links with click analytics" },
      {
        property: "og:description",
        content: "Shorten any URL, pick your own slug, and see who clicks.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-hero)" }}
          >
            <Link2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">Snippy</span>
        </div>
        <Button asChild variant="ghost">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 text-center sm:pt-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Free forever for personal use
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Short links that{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              actually look good
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            Shorten URLs, choose your own custom slug, and track every click — all from a clean,
            simple dashboard.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" style={{ boxShadow: "var(--shadow-glow)" }}>
              <Link to="/auth">Get started — it's free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">See features</a>
            </Button>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-5xl px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Instant shortening"
              desc="Paste any URL and get a clean short link in one click."
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Custom slugs"
              desc="Pick your own memorable slug, or let us generate one."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Click analytics"
              desc="See how many times each link gets clicked, in real time."
            />
          </div>
        </section>
      </main>

      <footer className="border-t bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground">
          Built with care. © {new Date().getFullYear()} Snippy.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="rounded-2xl border bg-card p-6"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
