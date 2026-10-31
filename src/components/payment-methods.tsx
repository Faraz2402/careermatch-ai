import Image from "next/image";
import type { MethodItem } from "@/lib/billing";
import { cx } from "@/lib/format";
import { BANK_LOGOS, WALLET_LOGOS } from "@/lib/payment-logos";

// Logos are the payment brands' own marks (served by our gateway, Razorpay),
// shown only to say which methods checkout accepts.

const UPI_APPS = [
  { name: "Google Pay", src: "/brand/pay/upi/googlepay.svg" },
  { name: "PhonePe", src: "/brand/pay/upi/phonepe.svg" },
  { name: "Paytm", src: "/brand/pay/upi/paytm.svg" },
  { name: "BHIM", src: "/brand/pay/upi/bhim.svg" },
  { name: "Amazon Pay", src: "/brand/pay/upi/amazonpay.svg" },
  { name: "CRED", src: "/brand/pay/upi/cred.svg" },
];

const NETWORKS = [
  { name: "Visa", src: "/brand/pay/cards/visa.svg", w: 44, h: 44 },
  { name: "Mastercard", src: "/brand/pay/cards/mastercard.svg", w: 58, h: 36 },
  { name: "RuPay", src: "/brand/pay/cards/rupay.svg", w: 76, h: 24 },
  { name: "American Express", src: "/brand/pay/cards/amex.svg", w: 44, h: 44 },
  { name: "Diners Club", src: "/brand/pay/cards/diners.svg", w: 44, h: 44 },
];

/** Popular banks first, then the rest alphabetically. */
const POPULAR = ["SBIN", "HDFC", "ICIC", "UTIB", "KKBK", "PUNB", "BARB", "CNRB", "UBIN", "BKID", "INDB", "YESB", "IDFB", "FDRL", "IBKL", "AUBL"];
const rank = (code: string | null) => {
  const i = POPULAR.indexOf((code ?? "").split("_")[0]);
  return i < 0 ? 99 : i;
};

const tile =
  "group relative flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#fff] p-3 text-center ring-1 ring-black/5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:z-10 hover:-translate-y-1.5 hover:scale-[1.07] hover:shadow-[0_22px_45px_-14px_rgba(124,58,237,0.55)] hover:ring-2 hover:ring-violet-400";
const tileLabel = "text-[12px] leading-tight font-semibold text-[#334155]";

const MONO = ["#7c3aed", "#db2777", "#ea580c", "#0891b2", "#059669", "#2563eb"];
function Monogram({ name }: { name: string }) {
  const initials = name.replace(/\(.*?\)|-.*$/g, "").split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
  const color = MONO[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % MONO.length];
  return (
    <span className="grid size-9 place-items-center rounded-full text-xs font-bold text-white" style={{ background: color }} aria-hidden>
      {initials || name[0]}
    </span>
  );
}

function Panel({ title, gradient, hint, children, className }: { title: string; gradient: string; hint: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx(className, "rounded-3xl border border-white/40 bg-surface/80 p-5 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-6")}>
      <h3 className={cx("bg-gradient-to-r bg-clip-text font-display text-2xl text-transparent", gradient)}>{title}</h3>
      <p className="mt-1 mb-5 text-sm text-slate-600">{hint}</p>
      {children}
    </section>
  );
}

/** Chip + contactless + embossed digits: an illustrative card, never a real number. */
function CardFace({ kind, holder, number, expiry, tier, network, bg }: { kind: string; holder: string; number: string; expiry: string; tier: string; network: { src: string; w: number; h: number; name: string }; bg: string }) {
  const emboss = { textShadow: "0 1px 0 rgba(255,255,255,0.35), 0 -1px 0 rgba(0,0,0,0.45)" };
  return (
    <div
      className={cx(
        "group relative aspect-[1.586] overflow-hidden rounded-2xl p-4 text-white shadow-[0_18px_40px_-15px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] hover:[transform:perspective(900px)_rotateY(-9deg)_rotateX(5deg)_translateY(-8px)_scale(1.03)] sm:p-5",
        bg,
      )}
    >
      {/* guilloché waves and moving glare */}
      <div aria-hidden className="absolute inset-0 opacity-30 [background:repeating-radial-gradient(circle_at_85%_120%,rgba(255,255,255,0.18)_0_1px,transparent_1px_9px)]" />
      <div aria-hidden className="absolute -inset-x-1/2 -top-1/2 h-[200%] w-[60%] rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-[260%] group-hover:opacity-100" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] uppercase opacity-80">{kind}</p>
            <p className="text-sm font-bold tracking-wide">{tier}</p>
          </div>
          {/* contactless */}
          <svg viewBox="0 0 24 24" className="size-6 opacity-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M8.5 7.5a6 6 0 0 1 0 9M12 5a9.5 9.5 0 0 1 0 14M15.5 2.5a13 13 0 0 1 0 19" />
          </svg>
        </div>
        {/* EMV chip */}
        <svg viewBox="0 0 48 36" className="mt-3 h-8 w-11 sm:h-9 sm:w-12" aria-hidden>
          <defs>
            <linearGradient id={`chip-${kind}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fde68a" />
              <stop offset="0.5" stopColor="#d4a017" />
              <stop offset="1" stopColor="#fef3c7" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="46" height="34" rx="6" fill={`url(#chip-${kind})`} stroke="#a16207" strokeWidth="1" />
          <path d="M1 12h14M1 24h14M33 12h14M33 24h14M15 1v34M33 1v34M15 18h18" stroke="#a16207" strokeWidth="1.2" fill="none" />
        </svg>
        <p className="mt-auto font-mono text-[15px] tracking-[0.18em] sm:text-lg" style={emboss}>{number}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] tracking-widest uppercase opacity-70">Card holder</p>
            <p className="truncate text-sm font-semibold tracking-wider uppercase" style={emboss}>{holder}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] tracking-widest uppercase opacity-70">Valid thru</p>
            <p className="font-mono text-sm" style={emboss}>{expiry}</p>
          </div>
          <Image src={network.src} alt={network.name} width={network.w} height={network.h} unoptimized className="h-8 w-auto shrink-0 drop-shadow" />
        </div>
      </div>
    </div>
  );
}

/** Everything Razorpay Checkout accepts, shown before payment. */
export function PaymentMethods({ banks, wallets, live }: { banks: MethodItem[]; wallets: MethodItem[]; live: boolean }) {
  const sorted = [...banks].sort((a, b) => rank(a.code) - rank(b.code) || a.name.localeCompare(b.name));
  const top = sorted.slice(0, 12);
  const rest = sorted.slice(12);
  const bankTile = (b: MethodItem) => (
    <li key={b.code ?? b.name} className={cx(tile, "min-h-[104px]")}>
      {b.code && BANK_LOGOS.has(b.code) ? (
        <Image src={`/brand/pay/banks/${b.code}.png`} alt="" width={48} height={48} unoptimized className="size-12 object-contain transition-transform duration-300 group-hover:scale-110" />
      ) : (
        <Monogram name={b.name} />
      )}
      <span className={cx(tileLabel, "line-clamp-2")}>{b.name}</span>
    </li>
  );

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200 p-4 sm:p-7 [background:radial-gradient(120%_80%_at_0%_0%,rgba(124,58,237,0.20),transparent_55%),radial-gradient(90%_70%_at_100%_0%,rgba(6,182,212,0.18),transparent_55%),radial-gradient(80%_70%_at_50%_100%,rgba(236,72,153,0.16),transparent_60%),var(--color-slate-50)]">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="UPI" gradient="from-emerald-500 via-teal-400 to-cyan-500" hint="Pay instantly from any UPI app: tap your app on mobile, or scan a QR / enter your UPI ID on desktop.">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {UPI_APPS.map((a) => (
              <li key={a.name} className={tile}>
                <Image src={a.src} alt="" width={40} height={40} unoptimized className="h-10 w-auto max-w-[72px] object-contain transition-transform duration-300 group-hover:scale-110" />
                <span className={tileLabel}>{a.name}</span>
              </li>
            ))}
            <li className={cx(tile, "col-span-1 sm:col-span-2")}>
              <span className="text-xl font-black tracking-tight">
                <span className="text-[#f7941d]">U</span>
                <span className="text-[#097939]">P</span>
                <span className="text-[#1d1d5c]">I</span>
              </span>
              <span className={tileLabel}>Any UPI app · UPI ID · QR</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Wallets" gradient="from-sky-500 via-indigo-500 to-violet-500" hint="Pay straight from your wallet balance.">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {wallets.map((w) => (
              <li key={w.code ?? w.name} className={cx(tile, "min-h-[96px]")}>
                {w.code && WALLET_LOGOS.has(w.code) ? (
                  <Image src={`/brand/pay/wallets/${w.code}.png`} alt="" width={128} height={48} unoptimized className="h-10 w-auto max-w-[120px] object-contain transition-transform duration-300 group-hover:scale-110" />
                ) : (
                  <Monogram name={w.name} />
                )}
                <span className={tileLabel}>{w.name}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="lg:col-span-2" title="Debit & credit cards" gradient="from-violet-500 via-fuchsia-500 to-rose-500" hint="Every major network, from any Indian or international bank. 3-D Secure / OTP verified.">
          <ul className="mb-5 flex flex-wrap gap-3">
            {NETWORKS.map((n) => (
              <li key={n.name} className={cx(tile, "h-16 w-[84px] p-2")} title={n.name}>
                <Image src={n.src} alt={n.name} width={n.w} height={n.h} unoptimized className="max-h-10 w-auto transition-transform duration-300 group-hover:scale-110" />
              </li>
            ))}
          </ul>
          <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
            <CardFace kind="Debit" tier="Platinum" holder="Ananya Sharma" number="4386 •••• •••• 2719" expiry="09/29" network={NETWORKS[0]} bg="bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_45%,#064e3b_100%)]" />
            <CardFace kind="Credit" tier="Signature" holder="Rohan Mehta" number="5412 •••• •••• 8830" expiry="11/30" network={NETWORKS[1]} bg="bg-[linear-gradient(135deg,#6d28d9_0%,#db2777_55%,#f97316_100%)]" />
          </div>
          <p className="mt-3 text-xs text-slate-500">Sample cards for illustration; names and numbers are made up.</p>
        </Panel>

        <Panel
          className="lg:col-span-2"
          title={`Net banking · ${banks.length} banks`}
          gradient="from-amber-500 via-orange-500 to-rose-500"
          hint={live ? "Live list of banks enabled on our payment gateway." : "Major banks shown; the full list appears in the checkout window."}
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{top.map(bankTile)}</ul>
          {rest.length > 0 && (
            <details className="group/more mt-4">
              <summary className="cursor-pointer list-none text-center text-sm font-semibold">
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  <span className="group-open/more:hidden">Show all {banks.length} banks ▾</span>
                  <span className="hidden group-open/more:inline">Show fewer ▴</span>
                </span>
              </summary>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{rest.map(bankTile)}</ul>
            </details>
          )}
        </Panel>

      </div>
    </div>
  );
}
