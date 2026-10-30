"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { api } from "./client";
import { ThemeToggle } from "./theme";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
  { href: "/resumes", label: "Resumes" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="order-last -mx-2 flex w-full gap-1 overflow-x-auto md:order-none md:mx-0 md:w-auto">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cx("rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap", active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
          >
            {l.label}
          </Link>
        );
      })}
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

  const item = "block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100";
  return (
    <div ref={ref} className="relative">
      <button className="btn-ghost gap-2 px-2" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="grid size-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{label.slice(0, 1).toUpperCase()}</span>
        <span className="hidden max-w-40 truncate md:inline">{label}</span>
        {plan === "pro" && <span className="chip bg-brand-600 text-white">Pro</span>}
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 z-40 mt-2 w-60 p-1.5 shadow-xl">
          <Link role="menuitem" href="/preferences" className={item}>Job preferences</Link>
          <Link role="menuitem" href="/alerts" className={item}>Saved searches & alerts</Link>
          <Link role="menuitem" href="/tools" className={item}>Save-to-CareerMatch button</Link>
          <Link role="menuitem" href="/sources" className={item}>Job sources</Link>
          <Link role="menuitem" href="/settings" className={item}>Settings & data</Link>
          <Link role="menuitem" href="/pricing" className={item}>{plan === "pro" ? "Plans" : "Upgrade to Pro"}</Link>
          {isAdmin && <Link role="menuitem" href="/admin" className={item}>Admin</Link>}
          <div className="my-1 border-t border-slate-100" />
          <ThemeToggle />
          <div className="my-1 border-t border-slate-100" />
          <button
            role="menuitem"
            className={cx(item, "w-full text-left")}
            onClick={async () => {
              await api("/api/auth/logout", { method: "POST" });
              router.push("/");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
