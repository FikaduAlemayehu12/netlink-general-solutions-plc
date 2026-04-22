import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Phone, ChevronLeft, ChevronRight } from "lucide-react";

import slideDatacenter from "@/assets/slide-datacenter.jpg";
import slideNoc from "@/assets/slide-noc.jpg";
import slideCybersecurity from "@/assets/slide-cybersecurity.jpg";
import slideSmartcity from "@/assets/slide-smartcity.jpg";
import slideCabling from "@/assets/slide-cabling.jpg";

interface Slide {
  src: string;
  eyebrow: string;
  title: string;
  highlight: string;
  caption: string;
  external?: boolean;
}

// 4 AI hero shots + 7 curated Unsplash IT photos = 11 slides
const SLIDES: Slide[] = [
  {
    src: slideDatacenter,
    eyebrow: "Data Center Infrastructure",
    title: "ENGINEERED FOR",
    highlight: "ZERO DOWNTIME",
    caption: "Tier-grade data centers, UPS, cooling and power systems built to keep Ethiopia online — 24/7.",
  },
  {
    src: slideNoc,
    eyebrow: "Network Operations",
    title: "MONITORED",
    highlight: "AROUND THE CLOCK",
    caption: "A live NOC watching every packet, every device, every site — across the country.",
  },
  {
    src: slideCybersecurity,
    eyebrow: "Cybersecurity",
    title: "DEFEND. DETECT.",
    highlight: "RESPOND.",
    caption: "End-to-end SOC, endpoint protection, and data security backed by certified specialists.",
  },
  {
    src: slideSmartcity,
    eyebrow: "Smart Infrastructure",
    title: "CONNECTING",
    highlight: "EVERY BUILDING",
    caption: "Structured cabling, IoT, and smart building systems for the cities of tomorrow.",
  },
  {
    src: slideCabling,
    eyebrow: "Field Engineering",
    title: "BUILT BY",
    highlight: "CERTIFIED HANDS",
    caption: "Internationally certified engineers delivering installations that last decades.",
  },
  {
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80",
    eyebrow: "Enterprise Networking",
    title: "WLAN, SDN &",
    highlight: "COLLABORATION",
    caption: "Modern network architectures that scale from one branch to nationwide deployments.",
    external: true,
  },
  {
    src: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1920&q=80",
    eyebrow: "Business Intelligence",
    title: "DATA INTO",
    highlight: "DECISIONS",
    caption: "ERP, analytics and digital office tools that turn information into measurable growth.",
    external: true,
  },
  {
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80",
    eyebrow: "IoT & Smart Devices",
    title: "EVERY DEVICE",
    highlight: "TALKS",
    caption: "Sensors, cameras, controllers — orchestrated into one secure, intelligent fabric.",
    external: true,
  },
  {
    src: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80",
    eyebrow: "Digital Office",
    title: "WORK WITHOUT",
    highlight: "FRICTION",
    caption: "Unified communications, collaboration suites and digital workflows for modern teams.",
    external: true,
  },
  {
    src: "https://images.unsplash.com/photo-1548611716-3000815a5803?auto=format&fit=crop&w=1920&q=80",
    eyebrow: "Power & Energy",
    title: "SOLAR. UPS.",
    highlight: "RESILIENCE.",
    caption: "Hybrid solar, generators and inverter systems that keep critical infrastructure live.",
    external: true,
  },
  {
    src: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1920&q=80",
    eyebrow: "Engineering Excellence",
    title: "20+ EXPERTS.",
    highlight: "ONE MISSION.",
    caption: "Connecting Ethiopia to the future — one network, one client, one breakthrough at a time.",
    external: true,
  },
];

const ROTATION_MS = 5000;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), ROTATION_MS);
    return () => clearInterval(t);
  }, [paused]);

  const slide = SLIDES[index];

  const go = (delta: number) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);

  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-navy-dark"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Netlink General Solutions — featured services slideshow"
    >
      {/* Slides */}
      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={slide.src}
            alt={slide.caption}
            className="w-full h-full object-cover animate-ken-burns"
            loading={index === 0 ? "eager" : "lazy"}
            width={1920}
            height={1080}
          />
        </motion.div>
      </AnimatePresence>

      {/* Layered overlays for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy-dark/95 via-navy-dark/70 to-navy-dark/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-dark via-transparent to-navy-dark/40" />
      <div className="absolute inset-0 network-pattern opacity-25" />

      {/* Content */}
      <div className="relative container mx-auto px-4 md:px-8 pt-20 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`txt-${index}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-brand/40 bg-cyan-brand/10 backdrop-blur-sm text-cyan-brand text-xs font-medium mb-6 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-brand animate-pulse" />
              {slide.eyebrow}
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-7xl leading-[0.95] text-sky-text mb-6 text-balance">
              {slide.title}
              <br />
              <span className="bg-clip-text text-transparent bg-[image:var(--gradient-brand)]">
                {slide.highlight}
              </span>
            </h1>
            <p className="text-body-text text-lg md:text-xl mb-8 max-w-xl leading-relaxed font-body">
              {slide.caption}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-heading font-semibold text-white shadow-glow transition-all hover:scale-[1.02] bg-[image:var(--gradient-brand)] hover:brightness-110"
              >
                Request a Demo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-3 border border-sky-text/30 text-sky-text font-heading font-semibold rounded-lg hover:bg-sky-text/10 hover:border-cyan-brand transition-colors"
              >
                Explore Solutions
              </Link>
              <a
                href="tel:+251910340909"
                className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-brand/50 text-emerald-brand font-heading font-semibold rounded-lg hover:bg-emerald-brand/10 transition-colors"
              >
                <Phone className="w-4 h-4" /> Get a Quote
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <button
        onClick={() => go(-1)}
        aria-label="Previous slide"
        className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-navy/40 backdrop-blur-md border border-sky-text/20 text-sky-text hover:bg-cyan-brand/30 hover:border-cyan-brand transition-all z-20"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next slide"
        className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-navy/40 backdrop-blur-md border border-sky-text/20 text-sky-text hover:bg-cyan-brand/30 hover:border-cyan-brand transition-all z-20"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dots + progress */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-8 bg-emerald-brand" : "w-1.5 bg-sky-text/40 hover:bg-sky-text/70"
              }`}
            />
          ))}
        </div>
        <span className="text-sky-text/50 text-[10px] tracking-widest font-medium">
          {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </span>
      </div>
    </section>
  );
}
