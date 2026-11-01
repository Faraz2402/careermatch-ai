import Link from "next/link";

const LINKS = [
  { href: "#product", label: "Product" },
  { href: "#features", label: "Features" },
  { href: "#method", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

/** Section links: plain text with a gradient underline that draws in on hover. */
export function LandingNav({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Sections" className={className}>
      <ul className="flex items-center gap-1 sm:gap-2">
        {LINKS.map(({ href, label }) => {
          const cls = "group relative block px-3 py-2 text-[15px] font-semibold text-slate-700 transition-colors hover:text-brand-700 focus-visible:text-brand-700 focus-visible:outline-none";
          const inner = (
            <>
              {label}
              <span aria-hidden className="absolute inset-x-3 bottom-1 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-[#4263ff] to-[#8457ff] transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
            </>
          );
          return (
            <li key={href}>
              {href.startsWith("#") ? <a href={href} className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
