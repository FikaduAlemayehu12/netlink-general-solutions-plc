import { motion } from "framer-motion";
import { Calendar, ArrowRight, Tag, Star, Image as ImageIcon, Newspaper, Heart, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
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
  like_count?: number;
  comment_count?: number;
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

export default function Blog() {
  const [news, setNews] = useState<SiteContent[]>([]);
  const [testimonials, setTestimonials] = useState<SiteContent[]>([]);
  const [gallery, setGallery] = useState<SiteContent[]>([]);
  const [counts, setCounts] = useState<Record<string, { likes: number; comments: number }>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_content" as any)
        .select("*")
        .eq("status", "published")
        .in("audience", ["client", "both"])
        .order("created_at", { ascending: false });
      const items = (data || []) as unknown as SiteContent[];
      setNews(items.filter(i => i.content_type === "news"));
      setTestimonials(items.filter(i => i.content_type === "testimonial"));
      setGallery(items.filter(i => i.content_type === "gallery"));

      // Load engagement counts
      const ids = items.map(i => i.id);
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
    })();
  }, []);

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

  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-4">
              Insights & News
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-primary-foreground mb-4">Blog & News</h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto">
              Industry insights, company updates, and stories from our team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* News */}
      {news.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <Newspaper className="w-5 h-5 text-cyan-brand" />
              <h2 className="font-heading font-bold text-3xl">Latest News</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item, i) => {
                const cover = (item.attachment_urls || []).find(isImage);
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                    <Link to="/blog/$id" params={{ id: item.id }}
                      className="block bg-card rounded-xl border border-border shadow-card hover:shadow-glow hover:border-cyan-brand/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden h-full flex flex-col group">
                      {cover && (
                        <div className="h-44 overflow-hidden bg-muted">
                          <img src={cover} alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-brand/10 text-cyan-brand w-fit mb-2">
                          <Tag className="w-2.5 h-2.5" /> News
                        </span>
                        <h3 className="font-heading font-bold text-lg mb-2 leading-snug group-hover:text-cyan-brand transition-colors">{item.title}</h3>
                        {item.content && <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-3 line-clamp-3">{item.content}</p>}
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(item.created_at), "MMM d, yyyy")}
                          </div>
                          <EngageBadge id={item.id} />
                        </div>
                        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-cyan-brand group-hover:gap-2 transition-all">
                          Read more <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 bg-secondary/40">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <Star className="w-5 h-5 text-gold" />
              <h2 className="font-heading font-bold text-3xl">Client Testimonials</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Link to="/blog/$id" params={{ id: item.id }}
                    className="block bg-card rounded-xl border border-border shadow-card hover:shadow-glow hover:border-gold/40 hover:-translate-y-1 transition-all duration-300 p-6 h-full flex flex-col group">
                    {item.rating && (
                      <div className="flex gap-0.5 mb-3">
                        {Array.from({ length: item.rating }).map((_, idx) => (
                          <Star key={idx} className="w-4 h-4 fill-gold text-gold" />
                        ))}
                      </div>
                    )}
                    <blockquote className="text-sm text-foreground/80 italic leading-relaxed flex-1 mb-4 line-clamp-4 group-hover:text-foreground transition-colors">
                      "{item.content || item.title}"
                    </blockquote>
                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                      <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-heading font-bold text-xs">
                        {(item.client_name || "C").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-semibold text-sm truncate">{item.client_name || "Client"}</p>
                        {item.client_company && <p className="text-xs text-muted-foreground truncate">{item.client_company}</p>}
                      </div>
                      <EngageBadge id={item.id} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-8">
              <ImageIcon className="w-5 h-5 text-cyan-brand" />
              <h2 className="font-heading font-bold text-3xl">Gallery</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((item, i) => {
                const cover = (item.attachment_urls || []).find(isImage);
                if (!cover) return null;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <Link to="/blog/$id" params={{ id: item.id }}
                      className="block rounded-xl overflow-hidden border border-border shadow-card group cursor-pointer aspect-square relative">
                      <img src={cover} alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <p className="text-primary-foreground font-heading font-semibold text-sm mb-1 line-clamp-2">{item.title}</p>
                        <EngageBadge id={item.id} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {news.length === 0 && testimonials.length === 0 && gallery.length === 0 && (
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">No content published yet. Check back soon!</p>
          </div>
        </section>
      )}
    </main>
  );
}
