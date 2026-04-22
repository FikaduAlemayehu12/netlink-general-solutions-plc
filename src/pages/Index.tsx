import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroSlideshow from "@/components/HeroSlideshow";
import PartnersStrip from "@/components/PartnersStrip";
import {
  Network, Shield, Server, Cpu, ChevronRight, Phone, ArrowRight,
  Users, Award, Globe, CheckCircle, Wifi, Building2, BarChart3, Star,
} from "lucide-react";

interface SiteContent {
  id: string;
  content_type: string;
  title: string;
  content: string | null;
  attachment_urls: string[];
  client_name: string | null;
  client_company: string | null;
  rating: number | null;
}

const stats = [
  { value: "20+", label: "Certified Engineers", icon: Users },
  { value: "2024", label: "Established", icon: Building2 },
  { value: "50+", label: "Projects Delivered", icon: Award },
  { value: "Pan-Africa", label: "Reach & Vision", icon: Globe },
];

const services = [
  { icon: Wifi,        title: "Enterprise Network Solutions",      desc: "WLAN, SDN, network management, and collaboration solutions for modern businesses." },
  { icon: BarChart3,   title: "Business Automation & Intelligence", desc: "ERP and digital office solutions to streamline operations and drive growth." },
  { icon: Building2,   title: "Smart Infrastructure",                desc: "Structured cabling, IoT, safety & security systems for connected facilities." },
  { icon: Server,      title: "Data Center & Power",                 desc: "Civil work, UPS, generators, solar, cooling systems for robust data centers." },
  { icon: Shield,      title: "Network & Cybersecurity",             desc: "SOC, endpoint security, data protection, and cybersecurity assessments." },
  { icon: Cpu,         title: "IT Power Solutions",                  desc: "End-to-end power solutions including electrical, solar, and inverter systems." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function Index() {
  const [testimonials, setTestimonials] = useState<SiteContent[]>([]);

  useEffect(() => {
    supabase
      .from("site_content" as any)
      .select("*")
      .eq("status", "published")
      .eq("content_type", "testimonial")
      .in("audience", ["client", "both"])
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setTestimonials((data || []) as unknown as SiteContent[]));
  }, []);

  return (
    <main className="min-h-screen">
      {/* Cinematic rotating hero */}
      <HeroSlideshow />

      {/* Stats */}
      <section className="bg-navy py-10 border-y border-cyan-brand/10">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ value, label, icon: Icon }, i) => (
            <motion.div
              key={label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[image:var(--gradient-brand)] flex items-center justify-center shrink-0 shadow-glow">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-heading font-bold text-xl text-sky-text">{value}</div>
                <div className="text-xs text-body-text/60">{label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="inline-block px-3 py-1 bg-accent/10 text-cyan text-xs tracking-widest uppercase rounded-full mb-3">
              What We Do
            </div>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-4">
              Our Core Solutions
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              End-to-end IT services tailored to the unique needs of Ethiopia's growing market.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="group p-6 bg-card rounded-xl border border-border hover:border-cyan-brand/40 shadow-card hover:shadow-glow transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-[image:var(--gradient-brand)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-glow">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{desc}</p>
                <Link to="/services" className="inline-flex items-center gap-1 text-xs font-medium text-cyan hover:gap-2 transition-all">
                  Learn more <ChevronRight className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners + trust badges */}
      <PartnersStrip />

      {/* Mission Strip — concise, no team/certified-experts paragraph */}
      <section className="py-20 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="text-xs text-emerald-brand tracking-widest uppercase mb-3">Our Mission</div>
            <h2 className="font-heading font-bold text-4xl text-sky-text mb-6 leading-tight">
              Bridging Ethiopia's Technology Gap
            </h2>
            <p className="text-body-text mb-6 leading-relaxed">
              We strive to be the leading provider of innovative IT solutions in Ethiopia, driving technological advancement and economic growth — empowering businesses and improving the quality of life across our community.
            </p>
            <ul className="space-y-3">
              {[
                "International partnerships with world-renowned IT vendors",
                "End-to-end service delivery with zero compromise",
                "24/7 support backed by certified specialists",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-body-text">
                  <CheckCircle className="w-4 h-4 text-emerald-brand shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-navy-light/60 backdrop-blur border border-cyan-brand/20 rounded-2xl p-8"
          >
            <div className="text-xs text-emerald-brand tracking-widest uppercase mb-3">Founder's Message</div>
            <blockquote className="text-sky-text italic text-lg leading-relaxed mb-6">
              "Our vision is to transform Ethiopia into a technologically advanced nation by providing cutting-edge IT solutions and contributing to Africa's economic and technological growth."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[image:var(--gradient-brand)] flex items-center justify-center font-heading font-bold text-white text-lg">
                FA
              </div>
              <div>
                <div className="font-heading font-semibold text-sky-text">Mr. Fikadu Alemayehu</div>
                <div className="text-xs text-cyan">Founder &amp; CEO, Netlink General Solutions</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Client Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <div className="inline-block px-3 py-1 bg-emerald-brand/10 text-emerald-brand text-xs tracking-widest uppercase rounded-full mb-3">
                What Our Clients Say
              </div>
              <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-4">Client Testimonials</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}
                  className="bg-card rounded-xl border border-border shadow-card p-6 flex flex-col hover:border-emerald-brand/40 hover:shadow-glow transition-all">
                  {item.rating && (
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: item.rating }).map((_, idx) => (
                        <Star key={idx} className="w-4 h-4 fill-emerald-brand text-emerald-brand" />
                      ))}
                    </div>
                  )}
                  <blockquote className="text-sm text-foreground/80 italic leading-relaxed flex-1 mb-4">
                    "{item.content || item.title}"
                  </blockquote>
                  <div className="flex items-center gap-3 pt-3 border-t border-border">
                    <div className="w-9 h-9 rounded-full bg-[image:var(--gradient-brand)] flex items-center justify-center text-white font-heading font-bold text-xs">
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

      {/* Final CTA */}
      <section className="py-20 bg-navy-dark relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="font-heading font-bold text-4xl md:text-5xl text-sky-text mb-4">Ready to Get Connected?</h2>
            <p className="text-body-text mb-8 max-w-md mx-auto">
              Let our team design the perfect IT solution for your business — request a personalized demo or get a quote today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-heading font-semibold text-white shadow-glow bg-[image:var(--gradient-brand)] hover:brightness-110 transition-all"
              >
                Request a Demo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-heading font-semibold text-emerald-brand border border-emerald-brand/50 hover:bg-emerald-brand/10 transition-colors"
              >
                Get a Quote
              </Link>
              <a
                href="tel:+251910340909"
                className="inline-flex items-center gap-2 px-8 py-3 border border-sky-text/30 text-sky-text font-heading font-semibold rounded-lg hover:bg-sky-text/10 transition-colors"
              >
                <Phone className="w-4 h-4" /> +251 910 340 909
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
