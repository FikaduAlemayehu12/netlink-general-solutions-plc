import { Link } from "@tanstack/react-router";
import { Network, Phone, Mail, MapPin, Facebook, MessageCircle, Linkedin, Instagram, Send } from "lucide-react";
import VisitorCounter from "./VisitorCounter";
import SubscribeForm from "./SubscribeForm";

export default function Footer() {
  return (
    <footer className="bg-navy text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center">
                <Network className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-heading font-bold text-base tracking-wide">NETLINK</div>
                <div className="text-[10px] text-cyan-brand tracking-widest">GENERAL SOLUTIONS</div>
              </div>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-4">
              Ethiopia's leading IT solutions provider. Delivering world-class technology services across Africa since 2024.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, href: "#", label: "Facebook" },
                { icon: Send, href: "#", label: "Telegram" },
                { icon: Linkedin, href: "#", label: "LinkedIn" },
                { icon: Instagram, href: "#", label: "Instagram" },
                { icon: MessageCircle, href: "#", label: "WhatsApp" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 rounded-md bg-navy-light hover:bg-cyan-brand/20 flex items-center justify-center transition-colors hover:text-cyan-brand"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold text-base tracking-wide mb-4 text-cyan-brand">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: "About Us", path: "/about" },
                { label: "Services", path: "/services" },
                { label: "Solutions", path: "/solutions" },
                { label: "Careers", path: "/careers" },
                { label: "Blog & News", path: "/blog" },
                { label: "Contact", path: "/contact" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-primary-foreground/70 hover:text-cyan-brand transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading font-semibold text-base tracking-wide mb-4 text-cyan-brand">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-primary-foreground/70">
                <MapPin className="w-4 h-4 text-cyan-brand shrink-0 mt-0.5" />
                Addis Ababa, Ethiopia
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Phone className="w-4 h-4 text-cyan-brand shrink-0" />
                +251910340909
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Phone className="w-4 h-4 text-cyan-brand shrink-0" />
                +251913671010
              </li>
              <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
                <Mail className="w-4 h-4 text-cyan-brand shrink-0" />
                info@netlink-gs.com
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-heading font-semibold text-base tracking-wide mb-4 text-cyan-brand">Stay Updated</h4>
            <p className="text-sm text-primary-foreground/70 mb-3">
              Subscribe for the latest insights and company news.
            </p>
            <SubscribeForm />
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-primary-foreground/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span>© 2025 Netlink General Solutions. All rights reserved.</span>
            <VisitorCounter />
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link to="/privacy" className="hover:text-cyan-brand transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-cyan-brand transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
