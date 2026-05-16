"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MobileSidebar from "@/components/layout/MobileSidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import InternalAiChat from "@/components/ai/InternalAiChat";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];

export default function AppShell({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const idleTimerRef = useRef(null);
  const loggedOutRef = useRef(false);

  async function logout({ redirect = true, keepalive = false } = {}) {
    if (loggedOutRef.current) return;
    loggedOutRef.current = true;

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        keepalive
      });
    } catch {}

    if (redirect) {
      router.replace("/login");
      router.refresh();
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((payload) => {
        if (!payload.success) {
          loggedOutRef.current = true;
          router.replace("/login");
          return;
        }
        setUser(payload.data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!user) return undefined;

    const resetIdleTimer = () => {
      if (loggedOutRef.current) return;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        logout({ redirect: true, keepalive: true });
      }, IDLE_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [router, user]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8f9fa] px-4">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6">
          <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 space-y-3">
            <div className="h-3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] print:bg-white">
      <Sidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <MobileSidebar user={user} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className={`transition-[padding] duration-200 print:pl-0 md:pl-16 ${collapsed ? "lg:pl-16" : "lg:pl-[260px]"}`}>
        <Topbar user={user} onOpenMenu={() => setMobileOpen(true)} collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} />
        <main className="w-full px-3 pb-28 pt-3 print:p-0 sm:px-5 sm:pt-5 md:pb-8 lg:px-6">{children}</main>
      </div>
      <InternalAiChat variant="floating" />
      <MobileBottomNav user={user} />
    </div>
  );
}
