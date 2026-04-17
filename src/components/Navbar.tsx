import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home",      path: "/" },
  { label: "About",     path: "/about" },
  { label: "Services",  path: "/services" },
  { label: "Solutions", path: "/solutions" },
  { label: "Blog",      path: "/blog" },
  { label: "Careers",   path: "/careers" },
  { label: "Contact",   path: "/contact" },
];


export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-navy/95 backdrop-blur-md shadow-lg border-b border-cyan-brand/10"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg gradient-brand flex items-center justify-center shadow-glow group-hover:animate-pulse-glow transition-all">
            <Network className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-bold text-lg text-primary-foreground tracking-wide">NETLINK</span>
            <span className="text-[10px] text-cyan-brand tracking-widest font-medium">GENERAL SOLUTIONS</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 text-sm font-medium font-heading tracking-wide transition-colors rounded-md ${
                location.pathname === link.path
                  ? "text-cyan-brand bg-cyan-brand/10"
                  : "text-primary-foreground/80 hover:text-cyan-brand hover:bg-cyan-brand/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/contact"
            className="ml-2 px-4 py-2 gradient-brand text-primary-foreground text-sm font-heading font-semibold rounded-md hover:opacity-90 transition-opacity shadow-md"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden text-primary-foreground p-2 rounded-md hover:bg-cyan-brand/10"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-navy/98 backdrop-blur-md border-t border-cyan-brand/10"
          >
            <nav className="container mx-auto py-4 px-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-3 text-sm font-heading font-medium tracking-wide rounded-md transition-colors ${
                    location.pathname === link.path
                      ? "text-cyan-brand bg-cyan-brand/10"
                      : "text-primary-foreground/80 hover:text-cyan-brand hover:bg-cyan-brand/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/contact"
                className="mt-2 px-4 py-3 gradient-brand text-primary-foreground text-sm font-heading font-semibold rounded-md text-center"
              >
                Get Started
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
