"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "@/components/ui/toast";

import { InquiriesModalContext } from "@/components/app/inquiries-modal-context";

const ContactPopup = dynamic(
  () => import("@/components/app/contact-popup").then((m) => m.ContactPopup),
  { ssr: false },
);
const InquiriesListModal = dynamic(
  () => import("@/components/app/inquiries-list-modal").then((m) => m.InquiriesListModal),
  { ssr: false },
);
const PricingModal = dynamic(
  () => import("@/components/app/pricing-modal").then((m) => m.PricingModal),
  { ssr: false },
);
const SettingsModal = dynamic(
  () => import("@/components/app/settings-modal").then((m) => m.SettingsModal),
  { ssr: false },
);
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";
import { authApi } from "@/lib/api";
import { clearStoredTokens, hasStoredAccessToken } from "@/lib/auth-storage";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { InquiryStatus, SellerResponse } from "@/types/api";

interface AppShellProps {
  children: React.ReactNode;
}

const NAV_LINKS = [
  {
    label: "Sourcing",
    href: "/sourcing",
    icon: ShoppingBag,
  },
  {
    label: "Auto Reply",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
];

function LogoIcon() {
  return (
    <Link
      href="/sourcing"
      className="flex w-9 items-center justify-center py-1 relative z-20"
    >
      <Image src="/leviosa-logo-bw.png" alt="Leviosa AI" width={24} height={24} className="w-6 h-6 flex-shrink-0 object-contain" />
    </Link>
  );
}

function UserPopupMenu({
  seller,
  sellerLoading,
  onLogout,
  onOpenSettings,
  onOpenPricing,
}: {
  seller: SellerResponse | null;
  sellerLoading: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenPricing: () => void;
}) {
  const { open: sidebarOpen, animate } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const avatarSeed = seller?.id ?? "default";
  const avatarUrl = `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(avatarSeed)}`;

  return (
    <div className="relative" ref={menuRef}>
      {/* Popup menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-border/40 bg-white shadow-[0_4px_24px_rgba(0,0,0,.12)] z-50 overflow-hidden"
          >
            {/* User info */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="size-9 flex-shrink-0 rounded-full bg-neutral-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl} alt="" className="size-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {seller?.name ?? "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {seller?.email ?? ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/50" />

            {/* Menu items */}
            <div className="py-1.5">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenPricing();
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-neutral-50 transition-colors"
              >
                <Sparkles className="size-4 text-muted-foreground" />
                Upgrade plan
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-neutral-50 transition-colors"
              >
                <Settings className="size-4 text-muted-foreground" />
                Settings
              </button>
            </div>

            <div className="h-px bg-border/50" />

            <div className="py-1.5">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-neutral-50 transition-colors"
              >
                <LogOut className="size-4 text-muted-foreground" />
                Log out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar trigger button */}
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-sidebar-accent/50",
          !sidebarOpen && animate && "justify-center",
        )}
      >
        <div className="size-8 flex-shrink-0 rounded-full bg-neutral-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="" className="size-full" />
        </div>
        <motion.span
          animate={{
            display: animate ? (sidebarOpen ? "inline-block" : "none") : "inline-block",
            opacity: animate ? (sidebarOpen ? 1 : 0) : 1,
          }}
          className="text-sm font-medium text-sidebar-foreground truncate whitespace-pre inline-block !p-0 !m-0"
        >
          {sellerLoading ? "" : (seller?.name ?? "User")}
        </motion.span>
      </button>
    </div>
  );
}

function SidebarNav({
  seller,
  sellerLoading,
  onLogout,
  onOpenSettings,
  onOpenPricing,
}: {
  seller: SellerResponse | null;
  sellerLoading: boolean;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenPricing: () => void;
}) {
  const pathname = usePathname();
  const links = useMemo(() => NAV_LINKS.map((item) => ({
    label: item.label,
    href: item.href,
    icon: (
      <item.icon className="size-5 flex-shrink-0" />
    ),
  })), []);

  const isActive = (href: string) =>
    pathname === href || (href !== "/sourcing" && pathname.startsWith(href));

  return (
    <>
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <LogoIcon />
        <div className="mt-8 flex flex-col gap-1">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              link={link}
              active={isActive(link.href)}
            />
          ))}
        </div>
      </div>
      <div className="mx-2 my-4 h-px bg-border/40" />
      <UserPopupMenu
        seller={seller}
        sellerLoading={sellerLoading}
        onLogout={onLogout}
        onOpenSettings={onOpenSettings}
        onOpenPricing={onOpenPricing}
      />
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [seller, setSeller] = useState<SellerResponse | null>(null);
  const [sellerLoading, setSellerLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [inquiriesOpen, setInquiriesOpen] = useState(false);
  const [inquiriesInitialStatus, setInquiriesInitialStatus] = useState<
    InquiryStatus | undefined
  >(undefined);

  const openInquiriesModal = useCallback(
    (initialStatus?: InquiryStatus) => {
      setInquiriesInitialStatus(initialStatus);
      setInquiriesOpen(true);
    },
    [],
  );

  const inquiriesModalContextValue = useMemo(
    () => ({ openInquiriesModal }),
    [openInquiriesModal],
  );

  const loadSeller = useCallback(async () => {
    try {
      setSellerLoading(true);
      const response = await authApi.me();
      setSeller(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSellerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasStoredAccessToken()) {
      router.replace("/login");
      return;
    }

    setAuthChecked(true);
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    void loadSeller();
  }, [authChecked, loadSeller]);

  const handleLogout = useCallback(() => {
    clearStoredTokens();
    router.replace("/login");
  }, [router]);

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleOpenPricing = useCallback(() => setPricingOpen(true), []);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,theme(colors.slate.100),theme(colors.background))]">
        <div className="space-y-2 text-center">
          <Sparkles className="mx-auto size-6 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <InquiriesModalContext.Provider value={inquiriesModalContextValue}>
      <div className="noise relative flex h-screen w-full flex-col overflow-hidden bg-sidebar md:flex-row">
        <Sidebar open={open} setOpen={setOpen} animate>
          <SidebarBody className="justify-between">
            <SidebarNav
              seller={seller}
              sellerLoading={sellerLoading}
              onLogout={handleLogout}
              onOpenSettings={handleOpenSettings}
              onOpenPricing={handleOpenPricing}
            />
          </SidebarBody>
        </Sidebar>
        <main
          className={cn(
            "relative flex-1 overflow-y-auto",
            "bg-white",
            "md:rounded-tl-2xl",
            "[box-shadow:0_8px_32px_rgba(0,0,0,0.09),inset_0_4px_20px_rgba(255,255,255,0.08)]",
          )}
        >
          <div className="border-none p-4 md:p-8">{children}</div>
        </main>
      </div>

      <InquiriesListModal
        open={inquiriesOpen}
        onOpenChange={setInquiriesOpen}
        initialStatus={inquiriesInitialStatus}
      />

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      <ContactPopup />
    </InquiriesModalContext.Provider>
  );
}
