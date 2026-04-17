import heroBg from "@/assets/hero-bg.jpg";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  {
    icon: Wifi,
    title: "Enterprise Network Solutions",
    desc: "WLAN, SDN, network management, and collaboration solutions for modern businesses.",
    color: "text-cyan-brand",
  },
  {
    icon: BarChart3,
    title: "Business Automation & Intelligence",
    desc: "ERP and digital office solutions to streamline operations and drive growth.",
    color: "text-gold",
  },
  {
    icon: Building2,
    title: "Smart Infrastructure",
    desc: "Structured cabling, IoT, safety & security systems for connected facilities.",
    color: "text-cyan-brand",
  },
  {
    icon: Server,
    title: "Data Center & Power",
    desc: "Civil work, UPS, generators, solar, cooling systems for robust data centers.",
    color: "text-gold",
  },
  {
    icon: Shield,
    title: "Network & Cybersecurity",
    desc: "SOC, endpoint security, data protection, and cybersecurity assessments.",
    color: "text-cyan-brand",
  },
  {
    icon: Cpu,
    title: "IT Power Solutions",
    desc: "End-to-end power solutions including electrical, solar, and inverter systems.",
    color: "text-gold",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
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
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <img
          src={heroBg}
          alt="Network connectivity background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-navy/80" />
        <div className="absolute inset-0 network-pattern opacity-30" />

        <div className="relative container mx-auto px-4 md:px-8 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-brand/30 bg-cyan-brand/10 text-cyan-brand text-xs font-medium mb-6 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-brand animate-pulse" />
              Ethiopia's Premier IT Solutions Provider
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-7xl leading-none text-primary-foreground mb-6">
              CONNECTING<br />
              <span className="text-cyan">ETHIOPIA</span><br />
              TO THE FUTURE
            </h1>
            <p className="text-primary-foreground/75 text-lg md:text-xl mb-8 max-w-xl leading-relaxed font-body">
              World-class IT infrastructure, networking, cybersecurity, and enterprise solutions — delivered by certified experts based in Addis Ababa.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-3 gradient-brand text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-glow"
              >
                Explore Solutions <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-primary-foreground/30 text-primary-foreground font-heading font-semibold rounded-lg hover:bg-primary-foreground/10 transition-colors"
              >
                <Phone className="w-4 h-4" /> Get In Touch
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-primary-foreground/40 text-xs tracking-widest">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-cyan-brand/60 to-transparent" />
        </div>
      </section>

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
              <div className="w-10 h-10 rounded-lg bg-cyan-brand/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-cyan-brand" />
              </div>
              <div>
                <div className="font-heading font-bold text-xl text-primary-foreground">{value}</div>
                <div className="text-xs text-primary-foreground/50">{label}</div>
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
            <div className="inline-block px-3 py-1 bg-accent/10 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-3">
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
            {services.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="group p-6 bg-card rounded-xl border border-border hover:border-cyan-brand/30 shadow-card hover:shadow-glow transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{desc}</p>
                <Link to="/services" className="inline-flex items-center gap-1 text-xs font-medium text-cyan-brand hover:gap-2 transition-all">
                  Learn more <ChevronRight className="w-3 h-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Strip */}
      <section className="py-20 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-xs text-cyan-brand tracking-widest uppercase mb-3">Our Mission</div>
            <h2 className="font-heading font-bold text-4xl text-primary-foreground mb-6 leading-tight">
              Bridging Ethiopia's Technology Gap
            </h2>
            <p className="text-primary-foreground/70 mb-6 leading-relaxed">
              We strive to be the leading provider of innovative IT solutions in Ethiopia, driving technological advancement and economic growth. By delivering world-class services and products, we empower businesses and improve the quality of life in our community.
            </p>
            <ul className="space-y-3">
              {[
                "International partnerships with world-renowned IT companies",
                "20+ internationally certified engineers",
                "End-to-end service delivery with zero compromise",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-primary-foreground/80">
                  <CheckCircle className="w-4 h-4 text-cyan-brand shrink-0 mt-0.5" />
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
            <div className="text-xs text-gold tracking-widest uppercase mb-3">Founder's Message</div>
            <blockquote className="text-primary-foreground/90 italic text-lg leading-relaxed mb-6">
              "Our vision is to transform Ethiopia into a technologically advanced nation by providing cutting-edge IT solutions and contributing to Africa's economic and technological growth."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center font-heading font-bold text-primary-foreground text-lg">
                FA
              </div>
              <div>
                <div className="font-heading font-semibold text-primary-foreground">Mr. Fikadu Alemayehu</div>
                <div className="text-xs text-cyan-brand">Founder & CEO, Netlink General Solutions</div>
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
              <div className="inline-block px-3 py-1 bg-gold/10 text-gold text-xs tracking-widest uppercase rounded-full mb-3">
                What Our Clients Say
              </div>
              <h2 className="font-heading font-bold text-4xl md:text-5xl text-foreground mb-4">Client Testimonials</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="bg-card rounded-xl border border-border shadow-card p-6 flex flex-col hover:border-gold/30 transition-all">
                  {item.rating && <div className="text-gold text-sm mb-3">{"⭐".repeat(item.rating)}</div>}
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


      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading font-bold text-4xl mb-4">Ready to Get Connected?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Contact our team today and let us design the perfect IT solution for your business.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/contact"
                className="px-8 py-3 gradient-brand text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-glow"
              >
                Request a Service
              </Link>
              <a
                href="tel:+251910340909"
                className="inline-flex items-center gap-2 px-8 py-3 border border-border text-foreground font-heading font-semibold rounded-lg hover:bg-secondary transition-colors"
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
