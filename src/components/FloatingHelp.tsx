import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, Mail, X, HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

export default function FloatingHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 left-0 w-64 bg-card border border-border rounded-2xl shadow-glow p-4 space-y-2"
          >
            <div className="font-heading font-bold text-sm mb-2 text-foreground">Need help? Get in touch.</div>
            <a
              href="tel:+251910340909"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm"
            >
              <Phone className="w-4 h-4 text-cyan" /> +251 910 340 909
            </a>
            <a
              href="mailto:info@netlink-gs.com"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm"
            >
              <Mail className="w-4 h-4 text-cyan" /> info@netlink-gs.com
            </a>
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-sm font-medium text-emerald-brand"
            >
              <MessageCircle className="w-4 h-4" /> Request a Demo
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close help" : "Open help"}
        className="w-14 h-14 rounded-full bg-[image:var(--gradient-brand)] text-white shadow-glow flex items-center justify-center hover:brightness-110 transition-all"
      >
        {open ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
