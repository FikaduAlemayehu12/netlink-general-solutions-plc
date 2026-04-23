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
    handler();
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => setOpen(false), [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-navy-dark/95 backdrop-blur-md border-b ${
        scrolled ? "shadow-lg border-cyan-brand/25" : "border-cyan-brand/10"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 md:h-18 px-4 md:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-[image:var(--gradient-brand)] flex items-center justify-center shadow-glow group-hover:animate-pulse-glow transition-all">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-heading font-bold text-base md:text-lg tracking-[0.16em] bg-clip-text text-transparent bg-[image:var(--gradient-brand)] whitespace-nowrap">
              NETLINK
            </span>
            <span className="text-[9px] md:text-[10px] text-sky-text/85 tracking-[0.24em] font-semibold mt-0.5 whitespace-nowrap">
              GENERAL SOLUTIONS
            </span>
          </div>
        </Link>

        {/* Desktop Nav — evenly spaced, consistent gradient underline */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {navLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-3 xl:px-4 py-2 text-sm font-semibold font-heading tracking-wide rounded-md transition-colors ${
                  active
                    ? "text-emerald-brand"
                    : "text-sky-text/90 hover:text-cyan-brand"
                }`}
              >
                {link.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-3 right-3 -bottom-0.5 h-[2px] rounded-full bg-[image:var(--gradient-brand)]"
                  />
                )}
              </Link>
            );
          })}
          <Link
            to="/contact"
            className="ml-3 px-5 py-2 bg-[image:var(--gradient-brand)] text-white text-sm font-heading font-semibold rounded-md hover:brightness-110 hover:scale-[1.02] transition-all shadow-glow"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          className="lg:hidden text-sky-text p-2 rounded-md hover:bg-cyan-brand/10 hover:text-cyan-brand transition-colors"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu — same gradient underline language */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-navy-dark/98 backdrop-blur-md border-t border-cyan-brand/20 overflow-hidden"
          >
            <nav className="container mx-auto py-4 px-4 flex flex-col gap-1">
              {navLinks.map((link) => {
                const active = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`relative px-4 py-3 text-sm font-heading font-semibold tracking-wide rounded-md transition-colors ${
                      active
                        ? "text-emerald-brand bg-emerald-brand/10"
                        : "text-sky-text/90 hover:text-cyan-brand hover:bg-cyan-brand/5"
                    }`}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute left-4 right-4 bottom-1 h-[2px] rounded-full bg-[image:var(--gradient-brand)]" />
                    )}
                  </Link>
                );
              })}
              <Link
                to="/contact"
                className="mt-3 px-4 py-3 bg-[image:var(--gradient-brand)] text-white text-sm font-heading font-semibold rounded-md text-center shadow-glow"
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
