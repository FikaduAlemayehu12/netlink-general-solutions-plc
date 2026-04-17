import { motion } from "framer-motion";
import { Building2, Target, Eye, Award, Users } from "lucide-react";

const team = [
  {
    name: "Mr. Fikadu Alemayehu",
    role: "Founder & CEO",
    initials: "FA",
    bio: "With a passion for technology and innovation, Mr. Fikadu founded Netlink General Solutions to address the technological challenges in Ethiopia. His vision and leadership have been instrumental in steering the company towards success.",
  },
  {
    name: "Mr. Feyisa Bekele",
    role: "Chief Technology Officer",
    initials: "FB",
    bio: "Brings over 10 years of experience in IT infrastructure and network solutions. His expertise in designing and implementing advanced technological systems has been crucial in delivering top-notch services.",
  },
  {
    name: "Mr. Ysak Alemayehu",
    role: "Head of Business Development",
    initials: "YA",
    bio: "Responsible for identifying new business opportunities and fostering partnerships with global IT companies. His strategic approach and market insights have helped expand reach and capabilities.",
  },
  {
    name: "Ms. Hana Alemu",
    role: "Lead Software Engineer",
    initials: "HA",
    bio: "Leads the software development team with a focus on creating innovative and user-friendly solutions. Her technical skills and dedication to quality ensure successful project delivery.",
  },
  {
    name: "Engineering Team",
    role: "IT & Network Engineers",
    initials: "ET",
    bio: "Mr. Fayera, Mr. Lalisa, and Mr. Henok specialize in IT and network solutions, ensuring clients receive reliable and efficient service.",
  },
  {
    name: "Infrastructure Team",
    role: "Data Center & Facility Engineers",
    initials: "IT",
    bio: "Mr. Endale, Mr. Abebe, and Mr. Abdi are responsible for maintaining and optimizing data center facilities, ensuring robust and reliable infrastructure.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function About() {
  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-4">
              About Us
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-primary-foreground mb-4">
              Who We Are
            </h1>
            <p className="text-primary-foreground/70 max-w-2xl mx-auto text-lg">
              Netlink General Solutions — Ethiopia's pioneering IT enterprise solutions provider, connecting businesses to a technologically advanced future.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Company History */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-cyan-brand" />
                </div>
                <h2 className="font-heading font-bold text-3xl">Our History</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Netlink General Solutions was established in 2024 with a vision to revolutionize the IT sector in Ethiopia. Recognizing the gaps in technology and networking infrastructure, we embarked on a journey to provide innovative solutions tailored to the unique needs of the Ethiopian market.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Over the years, we have successfully completed various IT projects, solving critical problems and proving our potential to drive technological advancement. Our commitment to excellence has positioned us as a promising player in the IT industry, with aspirations to elevate Ethiopia's technology landscape.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Award, label: "Internationally Certified", desc: "Our team holds international certifications" },
                  { icon: Users, label: "20+ Experts", desc: "Dedicated certified professionals" },
                  { icon: Building2, label: "Addis Ababa Based", desc: "Heart of Ethiopia's capital" },
                  { icon: Target, label: "Pan-African Vision", desc: "Growing across the continent" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="p-5 bg-card rounded-xl border border-border shadow-card">
                    <Icon className="w-6 h-6 text-cyan-brand mb-2" />
                    <div className="font-heading font-semibold text-sm mb-1">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-secondary/40">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Target,
                title: "Our Mission",
                color: "text-cyan-brand",
                bg: "bg-cyan-brand/10",
                content: "Our mission is to be the leading provider of innovative IT solutions in Ethiopia, driving technological advancement and economic growth. We aim to bridge the technology gap, enhance networking infrastructure, and create employment opportunities in engineering and related fields.",
              },
              {
                icon: Eye,
                title: "Our Vision",
                color: "text-gold",
                bg: "bg-gold/10",
                content: "Our vision is to transform Ethiopia into a technologically advanced nation by providing cutting-edge IT solutions. We aspire to be recognized as the premier IT solutions provider in Africa, contributing to the continent's economic and technological growth.",
              },
            ].map(({ icon: Icon, title, color, bg, content }, i) => (
              <motion.div
                key={title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="p-8 bg-card rounded-2xl border border-border shadow-card"
              >
                <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="font-heading font-bold text-2xl mb-4">{title}</h3>
                <p className="text-muted-foreground leading-relaxed">{content}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <div className="inline-block px-3 py-1 bg-accent/10 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-3">
              The Team
            </div>
            <h2 className="font-heading font-bold text-4xl mb-4">Key Team Members</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Our certified experts bring decades of combined experience to deliver world-class IT solutions.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map(({ name, role, initials, bio }, i) => (
              <motion.div
                key={name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="p-6 bg-card rounded-xl border border-border shadow-card hover:border-cyan-brand/30 hover:shadow-glow transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center font-heading font-bold text-primary-foreground text-sm group-hover:scale-110 transition-transform">
                    {initials}
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-sm">{name}</div>
                    <div className="text-xs text-cyan-brand">{role}</div>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
