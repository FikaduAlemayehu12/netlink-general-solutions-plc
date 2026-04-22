import { motion } from "framer-motion";
import { Calendar, ArrowRight, Tag, Star, Image as ImageIcon, Newspaper, Heart, MessageCircle, Search, Sparkles, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface SiteContent {
  id: string;
  content_type: string;
  title: string;
  content: string | null;
  attachment_urls: string[];
  audience: string;
  status: string;
  client_name: string | null;
  client_company: string | null;
  rating: number | null;
  created_at: string;
  featured_image?: string | null;
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

// ~200 wpm reading speed
const readingTime = (text: string | null) => {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

// Auto-derive simple "tags" from title words (>3 chars, top 2)
const deriveTags = (item: SiteContent): string[] => {
  const stop = new Set(["with", "from", "this", "that", "have", "been", "your", "their", "about"]);
  const words = (item.title || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  return Array.from(new Set(words)).slice(0, 3);
};

const CATEGORIES = [
  { key: "all",         label: "All Posts",   icon: Sparkles },
  { key: "news",        label: "News",        icon: Newspaper },
  { key: "testimonial", label: "Testimonials",icon: Star },
  { key: "gallery",     label: "Gallery",     icon: ImageIcon },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

export default function Blog() {
  const [items, setItems] = useState<SiteContent[]>([]);
  const [counts, setCounts] = useState<Record<string, { likes: number; comments: number }>>({});
  const [category, setCategory] = useState<CategoryKey>("all");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("site_content" as any)
        .select("*")
        .eq("status", "published")
        .in("audience", ["client", "both"])
        .order("created_at", { ascending: false }); // latest first
      const list = (data || []) as unknown as SiteContent[];
      setItems(list);

      const ids = list.map((i) => i.id);
      if (ids.length > 0) {
        const [likesRes, commentsRes] = await Promise.all([
          supabase.from("content_likes").select("content_id").in("content_id", ids),
          supabase.from("content_comments").select("content_id").in("content_id", ids),
        ]);
        const c: Record<string, { likes: number; comments: number }> = {};
        for (const id of ids) c[id] = { likes: 0, comments: 0 };
        for (const l of (likesRes.data || []) as any[]) if (c[l.content_id]) c[l.content_id].likes++;
        for (const cm of (commentsRes.data || []) as any[]) if (c[cm.content_id]) c[cm.content_id].comments++;
        setCounts(c);
      }
      setLoading(false);
    })();
  }, []);

  // Featured = top 1 most-engaged item from "news" category (or fallback to latest news)
  const featured = useMemo(() => {
    const news = items.filter((i) => i.content_type === "news");
    if (news.length === 0) return null;
    const scored = news.map((n) => ({
      n,
      score: (counts[n.id]?.likes || 0) * 2 + (counts[n.id]?.comments || 0) * 3,
    }));
    scored.sort((a, b) => b.score - a.score || +new Date(b.n.created_at) - +new Date(a.n.created_at));
    return scored[0].n;
  }, [items, counts]);

  // All tags pool (for chip strip)
  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => deriveTags(i).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t);
  }, [items]);

  // Filter pipeline
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (category !== "all" && i.content_type !== category) return false;
      if (activeTag && !deriveTags(i).includes(activeTag)) return false;
      if (q) {
        const hay = `${i.title} ${i.content || ""} ${i.client_name || ""} ${i.client_company || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, category, query, activeTag]);

  const EngageBadge = ({ id }: { id: string }) => {
    const c = counts[id];
    if (!c || (c.likes === 0 && c.comments === 0)) return null;
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {c.likes > 0 && <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {c.likes}</span>}
        {c.comments > 0 && <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {c.comments}</span>}
      </div>
    );
  };

  const Card = ({ item, i }: { item: SiteContent; i: number }) => {
    const cover = item.featured_image || (item.attachment_urls || []).find(isImage);
    const minutes = readingTime(item.content);
    const tags = deriveTags(item);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.04 }}
      >
        <Link
          to="/blog/$id"
          params={{ id: item.id }}
          className="block bg-card rounded-xl border border-border shadow-card hover:shadow-glow hover:border-cyan-brand/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full flex flex-col group"
        >
          {cover && (
            <div className="h-44 overflow-hidden bg-muted relative">
              <img
                src={cover}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-navy/80 text-cyan backdrop-blur">
                {item.content_type}
              </span>
            </div>
          )}
          <div className="p-5 flex flex-col flex-1">
            <h3 className="font-heading font-bold text-lg mb-2 leading-snug group-hover:text-cyan transition-colors line-clamp-2">{item.title}</h3>
            {item.content && <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-3 line-clamp-3">{item.content}</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground capitalize">#{t}</span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(item.created_at), "MMM d, yyyy")}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{minutes} min read</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan group-hover:gap-2 transition-all">
                Read more <ArrowRight className="w-3 h-3" />
              </span>
              <EngageBadge id={item.id} />
            </div>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-20 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan text-xs tracking-widest uppercase rounded-full mb-4">
              Insights & News
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-sky-text mb-4">Blog & News</h1>
            <p className="text-body-text max-w-xl mx-auto">
              Industry insights, company updates, and stories from our team — sorted latest first.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Featured post */}
      {featured && (
        <section className="py-12 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-emerald-brand" />
              <h2 className="font-heading font-bold text-2xl">Featured</h2>
            </div>
            <Link
              to="/blog/$id"
              params={{ id: featured.id }}
              className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border bg-card shadow-card hover:shadow-glow hover:border-cyan-brand/50 transition-all group"
            >
              <div className="aspect-video md:aspect-auto md:h-full overflow-hidden bg-muted">
                {(() => {
                  const cover = featured.featured_image || (featured.attachment_urls || []).find(isImage);
                  return cover ? (
                    <img src={cover} alt={featured.title} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full gradient-hero flex items-center justify-center">
                      <Newspaper className="w-16 h-16 text-sky-text/30" />
                    </div>
                  );
                })()}
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-semibold uppercase tracking-wider bg-emerald-brand/10 text-emerald-brand w-fit mb-3">
                  Featured · {featured.content_type}
                </span>
                <h3 className="font-heading font-bold text-3xl mb-3 group-hover:text-cyan transition-colors">{featured.title}</h3>
                {featured.content && <p className="text-muted-foreground leading-relaxed mb-4 line-clamp-4">{featured.content}</p>}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(featured.created_at), "MMM d, yyyy")}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readingTime(featured.content)} min read</span>
                  <EngageBadge id={featured.id} />
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan group-hover:gap-3 transition-all">
                  Read full story <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="py-8 bg-background sticky top-16 z-30 border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="container mx-auto px-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    category === key
                      ? "bg-[image:var(--gradient-brand)] text-white border-transparent shadow-glow"
                      : "bg-card text-foreground/70 border-border hover:border-cyan-brand/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <div className="relative md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, tags, clients…"
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-brand/40"
              />
            </div>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground self-center mr-1">Tags:</span>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag((cur) => (cur === t ? null : t))}
                  className={`text-[11px] px-2 py-0.5 rounded-full capitalize transition-colors ${
                    activeTag === t
                      ? "bg-emerald-brand text-white"
                      : "bg-secondary text-secondary-foreground hover:bg-cyan-brand/20"
                  }`}
                >
                  #{t}
                </button>
              ))}
              {(activeTag || query) && (
                <button
                  onClick={() => { setActiveTag(null); setQuery(""); }}
                  className="text-[11px] px-2 py-0.5 rounded-full text-destructive hover:bg-destructive/10"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Results grid */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-12">Loading posts…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-2">No posts match your filters.</p>
              <button onClick={() => { setCategory("all"); setQuery(""); setActiveTag(null); }} className="text-sm text-cyan font-medium hover:underline">Reset filters</button>
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-6">
                Showing {filtered.length} {filtered.length === 1 ? "post" : "posts"} · latest first
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item, i) => <Card key={item.id} item={item} i={i} />)}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
