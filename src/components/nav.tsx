"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BriefcaseBusiness, ChevronDown, MessagesSquare, CreditCard, Files, KanbanSquare, LayoutDashboard, LogOut, MousePointerClick, PenLine, Radar, Bell, Settings, ShieldCheck, SlidersHorizontal, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { api } from "./client";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/studio", label: "Make Resume & Cover Letter", icon: PenLine },
  { href: "/applications", label: "Applications", icon: KanbanSquare },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/resumes", label: "Resumes", icon: Files },
  { href: "/interview-qa", label: "Interview Q&A", icon: MessagesSquare },
  { href: "/preferences", label: "Job preferences", icon: SlidersHorizontal },
];

export function NavLinks() {
  const path = usePathname();
  const wrap = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);

  // Slide the gradient indicator under whichever link is active.
  useLayoutEffect(() => {
    const place = () => {
      const el = wrap.current?.querySelector<HTMLElement>("[aria-current=page]");
      setBar(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [path]);

  return (
    <nav ref={wrap} aria-label="Main" className="relative order-last -mx-2 flex w-full gap-0.5 overflow-x-auto pb-1.5 md:order-none md:mx-0 md:w-auto md:overflow-visible">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cx("group flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors", active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
          >
            <l.icon className={cx("size-4 shrink-0 transition-transform duration-300 group-hover:scale-110", active ? "text-brand-600" : "text-slate-400 group-hover:text-brand-500")} aria-hidden />
            {l.label}
          </Link>
        );
      })}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-px h-[3px] rounded-full bg-gradient-to-r from-[#4263ff] via-[#8457ff] to-[#19c6e8] transition-[left,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ left: bar?.left ?? 0, width: bar?.width ?? 0, opacity: bar ? 1 : 0 }}
      />
    </nav>
  );
}

export function UserMenu({ label, isAdmin, plan }: { label: string; isAdmin: boolean; plan: string }) {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700";
  const ic = "size-4 text-slate-400";
  return (
    <div ref={ref} className="relative">
      <button className="btn-ghost gap-2 px-2" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{label.slice(0, 1).toUpperCase()}</span>
        <span className="hidden max-w-32 truncate xl:inline">{label}</span>
        {plan === "pro" && <span className="chip bg-brand-600 text-white">Pro</span>}
        <ChevronDown className={cx("size-4 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="card menu-in absolute right-0 z-40 mt-2 w-64 p-1.5 shadow-xl">
          <Link role="menuitem" href="/alerts" className={item}><Bell className={ic} aria-hidden />Saved searches & alerts</Link>
          <Link role="menuitem" href="/tools" className={item}><MousePointerClick className={ic} aria-hidden />Save-to-CareerMatch button</Link>
          <Link role="menuitem" href="/sources" className={item}><Radar className={ic} aria-hidden />Job sources</Link>
          <Link role="menuitem" href="/settings" className={item}><Settings className={ic} aria-hidden />Settings & data</Link>
          <Link role="menuitem" href="/pricing" className={item}><CreditCard className={ic} aria-hidden />{plan === "pro" ? "Plans" : "Upgrade to Pro"}</Link>
          {isAdmin && <Link role="menuitem" href="/admin" className={item}><ShieldCheck className={ic} aria-hidden />Admin</Link>}
          <div className="my-1 border-t border-slate-100" />
          <button
            role="menuitem"
            className={cx(item, "w-full")}
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut className={ic} aria-hidden />Sign out
          </button>
        </div>
      )}
    </div>
  );
}
