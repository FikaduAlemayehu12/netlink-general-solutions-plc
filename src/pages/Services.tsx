import { motion } from "framer-motion";
import { Wifi, BarChart3, Building2, Server, Shield, Cpu, ChevronDown } from "lucide-react";
import { useState } from "react";

const categories = [
  {
    icon: Wifi,
    title: "Enterprise Network Solutions",
    color: "text-cyan-brand",
    bg: "bg-cyan-brand/10",
    desc: "Comprehensive networking solutions to build resilient, high-performance enterprise infrastructure.",
    items: [
      "Network & WLAN Solutions",
      "SDN Solutions",
      "Network Management Solutions",
      "Collaboration Solutions",
    ],
  },
  {
    icon: BarChart3,
    title: "Business Automation & Intelligence",
    color: "text-gold",
    bg: "bg-gold/10",
    desc: "Digital transformation tools that streamline operations and enable data-driven decision making.",
    items: [
      "ERP Solutions",
      "Digital Office Solutions",
    ],
  },
  {
    icon: Building2,
    title: "Smart Infrastructure",
    color: "text-cyan-brand",
    bg: "bg-cyan-brand/10",
    desc: "Connected building solutions for modern facilities with safety, security, and IoT capabilities.",
    items: [
      "Structured Cabling Systems & Towers",
      "Safety & Security",
      "Structured Cabling Systems",
      "Internet of Things (IoT)",
    ],
  },
  {
    icon: Server,
    title: "Data Center Facility & Power",
    color: "text-gold",
    bg: "bg-gold/10",
    desc: "End-to-end data center and power solutions for maximum uptime and efficiency.",
    items: [
      "Data Center Facilities (Civil Work, Renovation, and Containment)",
      "Power Systems (UPS, AVR, Generator, Electrical Systems, Solar, and Inverter)",
      "Cooling Systems",
    ],
  },
  {
    icon: Shield,
    title: "Network & Cybersecurity Solutions",
    color: "text-cyan-brand",
    bg: "bg-cyan-brand/10",
    desc: "Comprehensive security posture management to protect your assets and data from evolving threats.",
    items: [
      "Security Operations Center (SOC)",
      "Network and Application Security",
      "Endpoint Security",
      "Data Protection",
      "Access Management",
      "Cybersecurity Assessment and Defense",
    ],
  },
  {
    icon: Cpu,
    title: "IT Power Solutions",
    color: "text-gold",
    bg: "bg-gold/10",
    desc: "Reliable power management and electrical infrastructure designed for mission-critical IT environments.",
    items: [
      "UPS Systems",
      "AVR Systems",
      "Generator Solutions",
      "Solar Power Systems",
      "Inverter Systems",
    ],
  },
];

function ServiceCard({ category, index }: { category: typeof categories[0]; index: number }) {
  const [open, setOpen] = useState(false);
  const Icon = category.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="bg-card rounded-xl border border-border shadow-card hover:border-cyan-brand/30 transition-all"
    >
      <button
        className="w-full text-left p-6 flex items-start justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 ${category.bg} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className={`w-6 h-6 ${category.color}`} />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg mb-1">{category.title}</h3>
            <p className="text-muted-foreground text-sm">{category.desc}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6">
          <div className="border-t border-border pt-4 grid sm:grid-cols-2 gap-2">
            {category.items.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className={`w-1.5 h-1.5 rounded-full ${category.color === "text-cyan-brand" ? "bg-cyan-brand" : "bg-gold"}`} />
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Services() {
  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-4">
              What We Offer
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-primary-foreground mb-4">
              Our Services
            </h1>
            <p className="text-primary-foreground/70 max-w-2xl mx-auto text-lg">
              Comprehensive IT solutions from network infrastructure to cybersecurity — all under one roof.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col gap-4">
            {categories.map((cat, i) => (
              <ServiceCard key={cat.title} category={cat} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="py-20 bg-secondary/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-4xl mb-12">Why Choose Netlink?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "International Partnerships", desc: "Partnered with world-renowned IT companies" },
              { label: "Certified Expertise", desc: "20+ internationally certified engineers" },
              { label: "End-to-End Service", desc: "From design to deployment and support" },
              { label: "African-Focused", desc: "Solutions tailored for the Ethiopian market" },
            ].map(({ label, desc }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-card rounded-xl border border-border shadow-card text-left"
              >
                <div className="w-8 h-1 bg-gradient-to-r from-cyan-brand to-transparent rounded mb-4" />
                <div className="font-heading font-semibold mb-2">{label}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
