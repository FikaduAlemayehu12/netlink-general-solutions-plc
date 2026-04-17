import { useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
  { q: "What services does Netlink offer?", a: "We offer Enterprise Network Solutions, Business Automation & Intelligence, Smart Infrastructure, Data Center & Power solutions, and Network & Cybersecurity services." },
  { q: "Where is Netlink located?", a: "Netlink General Solutions is based in Addis Ababa, Ethiopia. We serve clients across the nation and aim to expand across Africa." },
  { q: "How can I contact Netlink?", a: "You can reach us at +251910340909 or +251913671010. Email us at info@netlink-gs.com or use the contact form on our website." },
  { q: "How do I request a service?", a: "You can submit a service request through our Contact page. Our team will respond quickly and help you get started." },
  { q: "Is Netlink certified?", a: "Yes! Our 20+ team members hold international certifications, making us a world-class IT company operating in Africa." },
];

interface Message {
  role: "bot" | "user";
  text: string;
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Hello! 👋 I'm the Netlink assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");

  const respond = (text: string) => {
    const lower = text.toLowerCase();
    const match = faqs.find((f) =>
      f.q.toLowerCase().split(" ").some((w) => w.length > 4 && lower.includes(w))
    );
    return match?.a ?? "Thank you for your message! For detailed inquiries, please contact us at +251910340909 or info@netlink-gs.com. Our team will respond shortly.";
  };

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", text: input };
    const botMsg: Message = { role: "bot", text: respond(input) };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 gradient-brand rounded-full flex items-center justify-center shadow-glow animate-pulse-glow hover:scale-110 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="w-6 h-6 text-primary-foreground" /> : <MessageCircle className="w-6 h-6 text-primary-foreground" />}
      </button>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-card rounded-2xl shadow-card border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="gradient-brand p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-heading font-semibold text-primary-foreground text-sm">Netlink Assistant</div>
                <div className="text-xs text-primary-foreground/70">Online • Typically replies instantly</div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 h-64 overflow-y-auto flex flex-col gap-3 bg-muted/30">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "gradient-brand text-primary-foreground rounded-br-sm"
                        : "bg-card text-foreground rounded-bl-sm shadow-card border border-border"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick replies */}
            <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto">
              {["Services", "Contact", "Certifications"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="shrink-0 px-2 py-1 text-xs border border-border rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border border-border outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={send}
                className="w-9 h-9 gradient-brand rounded-lg flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
