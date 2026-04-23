
-- Links table
CREATE TABLE public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  long_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_links_user_id ON public.links(user_id);
CREATE INDEX idx_links_slug ON public.links(slug);

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

-- Owners manage their own links
CREATE POLICY "Users can view own links" ON public.links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own links" ON public.links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own links" ON public.links
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own links" ON public.links
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public can read links by slug (needed for redirect resolution)
CREATE POLICY "Public can resolve links by slug" ON public.links
  FOR SELECT TO anon USING (true);

-- Clicks table
CREATE TABLE public.clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  user_agent text
);

CREATE INDEX idx_clicks_link_id ON public.clicks(link_id);
CREATE INDEX idx_clicks_clicked_at ON public.clicks(clicked_at DESC);

ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can record a click (server function will insert via admin client anyway, but allow anon as fallback)
CREATE POLICY "Anyone can insert clicks" ON public.clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Owners can read clicks for their links
CREATE POLICY "Users can view clicks for own links" ON public.clicks
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.links
      WHERE links.id = clicks.link_id AND links.user_id = auth.uid()
    )
  );
