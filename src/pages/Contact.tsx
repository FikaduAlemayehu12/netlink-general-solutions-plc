import { motion } from "framer-motion";
import { useState } from "react";
import { MapPin, Phone, Mail, Send, Facebook, Linkedin, Instagram, MessageCircle } from "lucide-react";

export default function Contact() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", service: "", message: ""
  });
  const [submitted, setSubmitted] = useState(false);

  const services = [
    "Enterprise Network Solutions",
    "Business Automation & Intelligence",
    "Smart Infrastructure",
    "Data Center Facility & Power",
    "Network & Cybersecurity",
    "Other",
  ];

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen pt-16">
      {/* Hero */}
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-block px-3 py-1 bg-cyan-brand/10 border border-cyan-brand/30 text-cyan-brand text-xs tracking-widest uppercase rounded-full mb-4">
              Reach Out
            </div>
            <h1 className="font-heading font-bold text-5xl md:text-6xl text-primary-foreground mb-4">Contact Us</h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto">
              Ready to take your IT infrastructure to the next level? Let's talk.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="font-heading font-bold text-3xl mb-2">Send Us a Message</h2>
              <p className="text-muted-foreground text-sm mb-8">Fill out the form and our team will get back to you promptly.</p>

              {submitted ? (
                <div className="p-8 bg-card rounded-xl border border-cyan-brand/30 text-center shadow-card">
                  <div className="w-14 h-14 gradient-brand rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">Message Sent!</h3>
                  <p className="text-muted-foreground text-sm">Thank you for contacting us. Our team will respond within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                      <input
                        name="name" required value={form.name} onChange={handle}
                        placeholder="Your full name"
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Email Address *</label>
                      <input
                        name="email" type="email" required value={form.email} onChange={handle}
                        placeholder="you@company.com"
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring transition"
                      />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                      <input
                        name="phone" value={form.phone} onChange={handle}
                        placeholder="+251 ..."
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Service of Interest</label>
                      <select
                        name="service" value={form.service} onChange={handle}
                        className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring transition"
                      >
                        <option value="">Select a service...</option>
                        {services.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Message *</label>
                    <textarea
                      name="message" required value={form.message} onChange={handle}
                      rows={5} placeholder="Describe your requirements..."
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-ring transition resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 gradient-brand text-primary-foreground font-heading font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-glow flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Send Message
                  </button>
                </form>
              )}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-6">
              <div>
                <h2 className="font-heading font-bold text-3xl mb-2">Get In Touch</h2>
                <p className="text-muted-foreground text-sm mb-8">Reach us through any of the channels below.</p>
              </div>

              {[
                { icon: MapPin, label: "Office", value: "Addis Ababa, Ethiopia" },
                { icon: Phone, label: "Phone", value: "+251910340909 / +251913671010" },
                { icon: Mail, label: "Email", value: "info@netlink-gs.com" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-card">
                  <div className="w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="font-medium text-sm">{value}</div>
                  </div>
                </div>
              ))}

              <div className="p-6 bg-card rounded-xl border border-border shadow-card">
                <div className="font-heading font-semibold mb-4">Connect on Social Media</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Facebook, label: "Facebook", href: "#" },
                    { icon: Send, label: "Telegram", href: "#" },
                    { icon: Linkedin, label: "LinkedIn", href: "#" },
                    { icon: Instagram, label: "Instagram", href: "#" },
                    { icon: MessageCircle, label: "WhatsApp", href: "https://wa.me/251910340909" },
                  ].map(({ icon: Icon, label, href }) => (
                    <a
                      key={label}
                      href={href}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-cyan-brand/40 hover:bg-accent/10 transition-colors text-sm"
                    >
                      <Icon className="w-4 h-4 text-cyan-brand" />
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Map placeholder */}
              <div className="h-48 rounded-xl overflow-hidden border border-border bg-navy/10 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-8 h-8 text-cyan-brand mx-auto mb-2" />
                  <div className="text-sm font-heading font-medium">Addis Ababa, Ethiopia</div>
                  <div className="text-xs text-muted-foreground">View on Google Maps</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
