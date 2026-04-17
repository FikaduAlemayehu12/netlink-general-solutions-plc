import { motion } from "framer-motion";
import { Network, Shield, Server, Wifi, Building2, BarChart3, CheckCircle, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const solutions = [
  {
    icon: Wifi,
    title: "Network & WLAN Solutions",
    category: "Enterprise Network",
    color: "text-cyan-brand",
    bg: "bg-cyan-brand/10",
    desc: "Design and deployment of high-performance enterprise wireless and wired networks, supporting thousands of concurrent users with zero downtime.",
    benefits: ["High availability architecture", "Centralized network management", "Scalable to enterprise needs", "Real-time monitoring and alerts"],
  },
  {
    icon: Network,
    title: "SDN Solutions",
    category: "Enterprise Network",
    color: "text-gold",
    bg: "bg-gold/10",
    desc: "Software-Defined Networking solutions that give your organization agility, automation, and centralized control over your entire network infrastructure.",
    benefits: ["Programmable network control", "Reduced operational costs", "Faster network provisioning", "Enhanced security policies"],
  },
  {
    icon: BarChart3,
    title: "ERP Solutions",
    category: "Business Automation",
    color: "text-cyan-brand",
    bg: "bg-cyan-brand/10",
    desc: "End-to-end ERP implementations that unify your business processes — from finance and HR to supply chain and operations — on a single integrated platform.",
    benefits: ["Real-time business insights", "Streamlined operations", "Automated reporting", "Custom module development"],
  },
  {
    icon: Shield,
    title: "Security Operations Center (SOC)",
    category: "Cybersecurity",
    color: "text-gold",
    bg: "bg-gold/10",
    desc: "24/7 monitoring and incident response capabilities to detect, analyze, and mitigate cybersecurity threats before they impact your business.",
    benefits: ["24/7 threat monitoring", "Incident response team", "Threat intelligence feeds", "Compliance reporting"],
  },
  {
    icon: Server,
    title: "Data Center Facilities",
    category: "Data Center & Power",
    color: "text-cyan-brand",
    bg: "bg-cyan-brand/10",
    desc: "Complete data center design, renovation, and build-out services — from civil construction to containment, cooling, and power management.",
    benefits: ["Civil work and renovation", "Hot/cold aisle containment", "Power distribution units", "Environmental monitoring"],
  },
  {
    icon: Building2,
    title: "Smart Infrastructure & IoT",
    category: "Smart Infrastructure",
    color: "text-gold",
    bg: "bg-gold/10",
    desc: "Transform your facility into an intelligent, connected environment using IoT sensors, smart automation, and integrated safety systems.",
    benefits: ["IoT sensor networks", "Building automation", "Safety & access control", "Energy management"],
  },
];

export default function Solutions() {
  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-4">
              Deep Dives
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-primary-foreground mb-4">Our Solutions</h1>
            <p className="text-primary-foreground/70 max-w-2xl mx-auto">
              Detailed breakdowns of our flagship solutions, built for Ethiopia's unique market needs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Solutions */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-10">
            {solutions.map(({ icon: Icon, title, category, color, bg, desc, benefits }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="grid md:grid-cols-2 gap-8 p-8 bg-card rounded-2xl border border-border shadow-card hover:border-cyan-brand/20 transition-all"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{category}</div>
                      <h2 className="font-heading font-bold text-xl">{title}</h2>
                    </div>
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-4">{desc}</p>
                  <Link to="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-brand hover:gap-3 transition-all">
                    Request this solution <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div>
                  <div className="text-sm font-heading font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Key Benefits</div>
                  <ul className="space-y-3">
                    {benefits.map((b) => (
                      <li key={b} className="flex items-center gap-3 text-sm">
                        <CheckCircle className="w-4 h-4 text-cyan-brand shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-10" />
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-4xl text-primary-foreground mb-4">Need a Custom Solution?</h2>
          <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
            Our team will design a bespoke IT solution tailored to your business requirements.
          </p>
          <Link to="/contact" className="inline-flex items-center gap-2 px-8 py-3 gradient-gold text-navy font-heading font-bold rounded-lg hover:opacity-90 transition-opacity shadow-glow">
            Talk to Our Experts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
