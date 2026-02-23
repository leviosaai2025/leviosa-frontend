"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CircleHelp,
  Headset,
  Instagram,
  Mail,
  Megaphone,
  MessageCircle,
  Users,
  Youtube,
} from "lucide-react";

import { AnimatedTooltip, type TooltipItem } from "@/components/ui/animated-tooltip";

const CONTACT_ITEMS: TooltipItem[] = [
  {
    id: 7,
    name: "News",
    designation: "Announcements",
    icon: <Megaphone className="size-6 text-orange-500" />,
    href: "https://www.notion.so/2ddbb03baeb38114968df13116b85c11?v=2ddbb03baeb3818fa423000ccf1361c2",
  },
  {
    id: 8,
    name: "Q&A",
    designation: "FAQ",
    icon: <CircleHelp className="size-6 text-violet-500" />,
    href: "https://www.notion.so/2ddbb03baeb381c4b56bf5e84e1aa6da",
  },
  {
    id: 1,
    name: "Instagram",
    designation: "@leviosa.ai",
    icon: <Instagram className="size-6 text-pink-500" />,
    href: "https://instagram.com/leviosa.ai",
  },
  {
    id: 2,
    name: "YouTube",
    designation: "Leviosa AI",
    icon: <Youtube className="size-6 text-red-500" />,
    href: "https://youtube.com/@leviosaai",
  },
  {
    id: 3,
    name: "Blog",
    designation: "Naver Blog",
    icon: <BookOpen className="size-6 text-emerald-500" />,
    href: "https://blog.naver.com/leviosaai",
  },
  {
    id: 4,
    name: "Community",
    designation: "Join us",
    icon: <Users className="size-6 text-blue-500" />,
    href: "https://cafe.naver.com/leviosaai",
  },
  {
    id: 5,
    name: "Email",
    designation: "leviosa.ai.kr@gmail.com",
    icon: <Mail className="size-6 text-amber-500" />,
    href: "mailto:leviosa.ai.kr@gmail.com",
  },
  {
    id: 6,
    name: "Naver TalkTalk",
    designation: "Chat with us",
    icon: <MessageCircle className="size-6 text-green-500" />,
    href: "https://talk.naver.com/ct/w7wwhb2?frm=psf",
  },
];

export function ContactPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            {/* Popup */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              className="absolute bottom-16 right-0 z-50 rounded-2xl bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,.12),0_0_0_1px_rgba(0,0,0,.04)]"
            >
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Contact & Community
              </h3>
              <p className="text-xs text-muted-foreground mb-5">
                Get in touch or follow us
              </p>
              <AnimatedTooltip items={CONTACT_ITEMS} className="pl-2 pr-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating trigger button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((prev) => !prev)}
        className="relative z-50 flex size-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg shadow-black/20 transition-colors hover:bg-neutral-800"
      >
        <Headset className="size-5" />
      </motion.button>
    </div>
  );
}
