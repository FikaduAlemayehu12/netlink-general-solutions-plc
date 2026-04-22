import { motion } from "framer-motion";
import { ShieldCheck, Award, BadgeCheck, Star, Cpu, Globe2 } from "lucide-react";

const PARTNERS = [
  { name: "Cisco", icon: Globe2 },
  { name: "Huawei", icon: Cpu },
  { name: "HPE", icon: Star },
  { name: "Microsoft", icon: BadgeCheck },
  { name: "Fortinet", icon: ShieldCheck },
  { name: "Dell EMC", icon: Award },
  { name: "Ubiquiti", icon: Globe2 },
  { name: "Schneider", icon: Cpu },
];

const TRUST = [
  { label: "ISO 27001 aligned", icon: ShieldCheck },
  { label: "Certified Engineers", icon: BadgeCheck },
  { label: "24/7 NOC Support", icon: Star },
  { label: "Pan-Africa Reach", icon: Globe2 },
];

export default function PartnersStrip() {
  return (
    <section className="bg-background border-y border-border py-10">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
          Trusted technology partners
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-10">
          {PARTNERS.map(({ name, icon: Icon }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-border bg-card hover:border-cyan-brand/40 hover:shadow-card transition-all group"
            >
              <Icon className="w-4 h-4 text-muted-foreground group-hover:text-cyan transition-colors" />
              <span className="font-heading font-semibold text-sm text-foreground/80 group-hover:text-foreground">
                {name}
              </span>
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST.map(({ label, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[image:var(--gradient-brand)]/5 border border-cyan-brand/20"
            >
              <div className="w-9 h-9 rounded-lg bg-[image:var(--gradient-brand)] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-semibold text-sm">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
