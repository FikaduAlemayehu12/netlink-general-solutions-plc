import { motion } from "framer-motion";
import { Calendar, User, ArrowRight, Tag, Star, Image as ImageIcon, Newspaper } from "lucide-react";
import { useState, useEffect } from "react";
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
}

const staticPosts = [
  {
    title: "The Future of Enterprise Networking in Ethiopia",
    excerpt: "As Ethiopia rapidly digitizes, enterprise networking is becoming the backbone of modern business operations. SDN and WLAN solutions are leading the charge.",
    author: "Mr. Feyisa Bekele",
    date: "February 2025",
    category: "Networking",
    readTime: "5 min read",
  },
  {
    title: "Cybersecurity Threats Facing African Businesses in 2025",
    excerpt: "From ransomware to phishing attacks, African enterprises must fortify their defenses. Our SOC team shares the top threats and how to mitigate them.",
    author: "Netlink Security Team",
    date: "January 2025",
    category: "Cybersecurity",
    readTime: "7 min read",
  },
  {
    title: "Solar-Powered Data Centers: A Sustainable Future for IT",
    excerpt: "With Ethiopia's abundant solar resources, data centers powered by renewable energy represent both an economic and environmental opportunity.",
    author: "Mr. Endale",
    date: "December 2024",
    category: "Infrastructure",
    readTime: "4 min read",
  },
  {
    title: "ERP Implementation: Lessons from the Ethiopian Market",
    excerpt: "Implementing ERP systems in Ethiopia comes with unique challenges. We share key insights from our deployments and what made them successful.",
    author: "Mr. Ysak Alemayehu",
    date: "November 2024",
    category: "Business Solutions",
    readTime: "6 min read",
  },
  {
    title: "IoT and Smart Buildings: Transforming Ethiopian Workplaces",
    excerpt: "From automated lighting to security systems, IoT is reshaping how Ethiopian companies manage their facilities.",
    author: "Ms. Hana Alemu",
    date: "October 2024",
    category: "Smart Infrastructure",
    readTime: "5 min read",
  },
  {
    title: "Netlink General Solutions: Our Journey in 2024",
    excerpt: "A year of growth, partnerships, and delivered projects — we reflect on what we've achieved and where we're headed as a leading Ethiopian IT company.",
    author: "Mr. Fikadu Alemayehu",
    date: "October 2024",
    category: "Company News",
    readTime: "3 min read",
  },
];

const catColors: Record<string, string> = {
  "Networking": "bg-cyan-brand/10 text-cyan-brand",
  "Cybersecurity": "bg-red-100 text-red-600",
  "Infrastructure": "bg-gold/10 text-gold",
  "Business Solutions": "bg-purple-100 text-purple-600",
  "Smart Infrastructure": "bg-green-100 text-green-600",
  "Company News": "bg-secondary text-secondary-foreground",
};

const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

export default function Blog() {
  const [news, setNews] = useState<SiteContent[]>([]);
  const [testimonials, setTestimonials] = useState<SiteContent[]>([]);
  const [gallery, setGallery] = useState<SiteContent[]>([]);

  useEffect(() => {
    supabase
      .from("site_content" as any)
      .select("*")
      .eq("status", "published")
      .in("audience", ["client", "both"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const items = (data || []) as SiteContent[];
        setNews(items.filter(i => i.content_type === "news"));
        setTestimonials(items.filter(i => i.content_type === "testimonial"));
        setGallery(items.filter(i => i.content_type === "gallery"));
      });
  }, []);

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
              Industry insights, company updates, and thought leadership from our experts.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Published News from CMS */}
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
                  <motion.article key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                    className="bg-card rounded-xl border border-border shadow-card hover:border-cyan-brand/30 transition-all overflow-hidden flex flex-col">
                    {cover && (
                      <div className="h-44 overflow-hidden">
                        <img src={cover} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-cyan-brand/10 text-cyan-brand w-fit mb-2">
                        <Tag className="w-2.5 h-2.5" /> News
                      </span>
                      <h3 className="font-heading font-bold text-lg mb-2 leading-snug">{item.title}</h3>
                      {item.content && <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-3 line-clamp-3">{item.content}</p>}
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.created_at), "MMMM d, yyyy")}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Client Testimonials */}
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
                  viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="bg-card rounded-xl border border-border shadow-card p-6 flex flex-col">
                  {item.rating && (
                    <div className="text-gold text-sm mb-3">{"⭐".repeat(item.rating)}</div>
                  )}
                  <blockquote className="text-sm text-foreground/80 italic leading-relaxed flex-1 mb-4">
                    "{item.content || item.title}"
                  </blockquote>
                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    <div className="w-9 h-9 rounded-full gradient-brand flex items-center justify-center text-primary-foreground font-heading font-bold text-xs">
                      {(item.client_name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm">{item.client_name || "Client"}</p>
                      {item.client_company && <p className="text-xs text-muted-foreground">{item.client_company}</p>}
                    </div>
                  </div>
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
              {gallery.flatMap(item => 
                (item.attachment_urls || []).filter(isImage).map((url, j) => (
                  <motion.div key={`${item.id}-${j}`} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} className="rounded-xl overflow-hidden border border-border shadow-card group cursor-pointer aspect-square">
                    <img src={url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Static Blog Posts */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="font-heading font-bold text-3xl mb-8">Blog Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staticPosts.map(({ title, excerpt, author, date, category, readTime }, i) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-card rounded-xl border border-border shadow-card hover:border-cyan-brand/30 hover:shadow-glow transition-all group flex flex-col"
              >
                <div className="h-1.5 rounded-t-xl bg-gradient-to-r from-cyan-brand to-transparent" />
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${catColors[category] ?? "bg-secondary text-secondary-foreground"}`}>
                      <Tag className="w-2.5 h-2.5" /> {category}
                    </span>
                    <span className="text-xs text-muted-foreground">{readTime}</span>
                  </div>
                  <h2 className="font-heading font-bold text-lg mb-3 group-hover:text-cyan-brand transition-colors leading-snug">
                    {title}
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-4">{excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" /> {author}
                      <Calendar className="w-3 h-3 ml-1" /> {date}
                    </div>
                    <a href="#" className="inline-flex items-center gap-1 text-xs font-medium text-cyan-brand group-hover:gap-2 transition-all">
                      Read <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
