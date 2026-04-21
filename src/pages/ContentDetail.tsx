import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Tag, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ContentEngagement from "@/components/ContentEngagement";

interface Item {
  id: string;
  content_type: string;
  title: string;
  content: string | null;
  attachment_urls: string[];
  client_name: string | null;
  client_company: string | null;
  rating: number | null;
  status: string;
  audience: string;
  created_at: string;
}

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

export default function ContentDetail() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<Item[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from("site_content" as any).select("*").eq("id", id).maybeSingle()
      .then(({ data }) => {
        const it = data as unknown as Item | null;
        setItem(it);
        setLoading(false);
        if (it) {
          supabase.from("site_content" as any).select("*")
            .eq("status", "published")
            .eq("content_type", it.content_type)
            .neq("id", it.id)
            .in("audience", ["client", "both"])
            .order("created_at", { ascending: false })
            .limit(3)
            .then(({ data: rel }) => setRelated((rel || []) as unknown as Item[]));
        }
      });
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!item) {
    return (
      <main className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Content not found</p>
          <Link to="/blog" className="text-primary hover:underline">← Back to Blog</Link>
        </div>
      </main>
    );
  }

  const cover = (item.attachment_urls || []).find(isImage);
  const otherImages = (item.attachment_urls || []).filter((u) => isImage(u) && u !== cover);

  return (
    <main className="min-h-screen pt-16 bg-background">
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        <button onClick={() => navigate({ to: "/blog" })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-brand/10 text-cyan-brand">
              <Tag className="w-2.5 h-2.5" /> {item.content_type}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(item.created_at), "MMMM d, yyyy")}
            </span>
          </div>

          <h1 className="font-heading font-bold text-3xl md:text-4xl mb-4 leading-tight">{item.title}</h1>

          {item.content_type === "testimonial" && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-muted/50">
              <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-heading font-bold">
                {(item.client_name || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-heading font-semibold">{item.client_name || "Client"}</p>
                {item.client_company && <p className="text-sm text-muted-foreground">{item.client_company}</p>}
                {item.rating && (
                  <div className="flex gap-0.5 mt-1">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-gold text-gold" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {cover && (
            <div className="rounded-2xl overflow-hidden border border-border mb-6 shadow-card">
              <img src={cover} alt={item.title} className="w-full max-h-[500px] object-cover" />
            </div>
          )}

          {item.content && (
            <div className="prose prose-lg max-w-none">
              <p className="text-foreground/85 leading-relaxed whitespace-pre-wrap text-lg">{item.content}</p>
            </div>
          )}

          {otherImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
              {otherImages.map((u, i) => (
                <div key={i} className="rounded-lg overflow-hidden border border-border aspect-square group">
                  <img src={u} alt={`${item.title} ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
              ))}
            </div>
          )}

          {/* Engagement */}
          <ContentEngagement contentId={item.id} contentType={item.content_type} contentTitle={item.title} />
        </motion.div>

        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="font-heading font-bold text-xl mb-5">Related</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => {
                const c = (r.attachment_urls || []).find(isImage);
                return (
                  <Link key={r.id} to="/blog/$id" params={{ id: r.id }}
                    className="group bg-card rounded-xl border border-border overflow-hidden hover:border-cyan-brand/40 hover:shadow-glow transition-all">
                    {c && <div className="h-32 overflow-hidden"><img src={c} alt={r.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div>}
                    <div className="p-3">
                      <p className="font-heading font-semibold text-sm line-clamp-2 group-hover:text-cyan-brand transition-colors">{r.title}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
