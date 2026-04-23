import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Bundled fallback assets (used if DB is empty / first paint)
import slideWelcome from "@/assets/slides/welcome-hero.jpg";
import slideDatacenter from "@/assets/slides/datacenter-addis.jpg";
import slideSmartcity from "@/assets/slides/smartcity-addis.jpg";
import slideTower from "@/assets/slides/network-tower.jpg";
import slideNoc from "@/assets/slides/cybersecurity-noc.jpg";

interface Slide {
  id: string;
  image_url: string;
  title: string | null;
  caption: string | null;
  cta_label: string | null;
  cta_link: string | null;
}

// Map seeded /src/assets/... paths to bundled imports for instant load
const BUNDLED: Record<string, string> = {
  "/src/assets/slides/welcome-hero.jpg": slideWelcome,
  "/src/assets/slides/datacenter-addis.jpg": slideDatacenter,
  "/src/assets/slides/smartcity-addis.jpg": slideSmartcity,
  "/src/assets/slides/network-tower.jpg": slideTower,
  "/src/assets/slides/cybersecurity-noc.jpg": slideNoc,
};

const FALLBACK_SLIDES: Slide[] = [
  {
    id: "fallback-1",
    image_url: slideWelcome,
    title: "Welcome to Netlink General Solutions PLC",
    caption: "Where Ethiopia's digital future begins and ambitious organizations find the technology partner they can trust to build bold, move smart, and grow without limits.",
    cta_label: "Get Started",
    cta_link: "/contact",
  },
];

const ROTATION_MS = 5000;

function resolveImage(url: string): string {
  return BUNDLED[url] ?? url;
}

export default function HeroSlideshow() {
  const [slides, setSlides] = useState<Slide[]>(FALLBACK_SLIDES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase
      .from("site_slides" as any)
      .select("id, image_url, title, caption, cta_label, cta_link")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setSlides(data as unknown as Slide[]);
        }
      });
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATION_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[index] ?? slides[0];

  return (
    <section
      className="relative min-h-[92vh] flex items-center overflow-hidden bg-navy-dark"
      aria-label="Netlink General Solutions — featured slideshow"
    >
      {/* Background slide with crossfade + ken-burns */}
      <AnimatePresence mode="sync">
        <motion.div
          key={slide.id + "-" + index}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={resolveImage(slide.image_url)}
            alt={slide.caption ?? slide.title ?? "Netlink slide"}
            className="w-full h-full object-cover animate-ken-burns"
            loading={index === 0 ? "eager" : "lazy"}
            width={1920}
            height={1080}
          />
        </motion.div>
      </AnimatePresence>

      {/* Layered overlays for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/80 via-navy-dark/55 to-navy-dark/90" />
      <div className="absolute inset-0 network-pattern opacity-25" />
      {/* Floating bubbles decorative layer */}
      <div className="hero-bubbles absolute inset-0 pointer-events-none">
        <span className="bubble bubble-1" />
        <span className="bubble bubble-2" />
        <span className="bubble bubble-3" />
        <span className="bubble bubble-4" />
        <span className="bubble bubble-5" />
        <span className="bubble bubble-6" />
      </div>

      {/* Content — perfectly centered */}
      <div className="relative container mx-auto px-4 md:px-8 pt-20 pb-12 z-10 flex justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={`txt-${slide.id}-${index}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-4xl text-center mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-brand/40 bg-cyan-brand/10 backdrop-blur-sm text-cyan-brand text-xs font-medium mb-6 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-brand animate-pulse" />
              Netlink General Solutions PLC
            </div>

            {slide.title && (
              <h1 className="font-heading font-bold text-4xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 text-balance">
                <span className="bg-clip-text text-transparent bg-[image:var(--gradient-brand)]">
                  {slide.title}
                </span>
              </h1>
            )}

            {slide.caption && (
              <p className="text-body-text text-base md:text-xl mb-8 mx-auto max-w-3xl leading-relaxed font-body">
                {slide.caption}
              </p>
            )}

            <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
              <Link
                to={(slide.cta_link as any) || "/contact"}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-heading font-semibold text-white shadow-glow transition-all hover:scale-[1.02] bg-[image:var(--gradient-brand)] hover:brightness-110"
              >
                {slide.cta_label || "Request a Demo"} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-3 border border-sky-text/30 text-sky-text font-heading font-semibold rounded-lg hover:bg-sky-text/10 hover:border-cyan-brand transition-colors"
              >
                Explore Services
              </Link>
              <a
                href="tel:+251910340909"
                className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-brand/50 text-emerald-brand font-heading font-semibold rounded-lg hover:bg-emerald-brand/10 transition-colors"
              >
                <Phone className="w-4 h-4" /> Get a Quote
              </a>
            </div>

            {/* Discrete progress dots — no counter, no arrows */}
            {slides.length > 1 && (
              <div className="flex gap-2 justify-center mt-10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === index ? "w-10 bg-emerald-brand" : "w-1.5 bg-sky-text/30 hover:bg-sky-text/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
