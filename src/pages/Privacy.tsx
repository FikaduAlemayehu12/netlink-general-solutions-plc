import { motion } from "framer-motion";

export default function Privacy() {
  return (
    <main className="min-h-screen pt-16">
      <section className="gradient-hero py-24 relative overflow-hidden">
        <div className="absolute inset-0 network-pattern opacity-20" />
        <div className="relative container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-heading font-bold text-5xl text-primary-foreground mb-4">Privacy Policy</h1>
          </motion.div>
        </div>
      </section>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl prose prose-sm">
          <div className="bg-card p-8 rounded-2xl border border-border shadow-card space-y-6 text-muted-foreground text-sm leading-relaxed">
            <div>
              <h2 className="font-heading font-bold text-xl text-foreground mb-3">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, such as when you submit a contact form, request a service, or apply for employment. This includes name, email address, phone number, and message content.</p>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-foreground mb-3">2. How We Use Your Information</h2>
              <p>We use the information collected to respond to inquiries, provide our IT services, process service requests, and improve our website experience. We do not sell personal data to third parties.</p>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-foreground mb-3">3. Data Security</h2>
              <p>Netlink General Solutions implements industry-standard security measures to protect your personal information. Access to personal data is restricted to authorized personnel only.</p>
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl text-foreground mb-3">4. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us at: info@netlink-gs.com or call +251910340909.</p>
            </div>
            <div className="text-xs text-muted-foreground/60">Last updated: February 2025 | Netlink General Solutions, Addis Ababa, Ethiopia</div>
          </div>
        </div>
      </section>
    </main>
  );
}
