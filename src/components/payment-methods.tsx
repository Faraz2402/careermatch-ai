import { cx } from "@/lib/format";

// Text badges (no copied logos) in each brand's colour.
const UPI_APPS = [
  { name: "Google Pay", cls: "bg-[#fff] text-[#1a73e8] ring-[#dadce0]" },
  { name: "PhonePe", cls: "bg-[#5f259f] text-white ring-[#5f259f]" },
  { name: "Paytm", cls: "bg-[#00baf2] text-white ring-[#00baf2]" },
  { name: "BHIM", cls: "bg-[#fff] text-[#f47c20] ring-[#f47c20]" },
  { name: "Amazon Pay", cls: "bg-[#232f3e] text-[#ff9900] ring-[#232f3e]" },
  { name: "CRED", cls: "bg-black text-white ring-black" },
  { name: "Any UPI app · UPI ID · QR", cls: "bg-[#fff] text-slate-700 ring-slate-300" },
];

const CARD_NETWORKS = [
  { name: "VISA", cls: "bg-[#1a1f71] text-white italic tracking-wider" },
  { name: "Mastercard", cls: "bg-[#231f20] text-white", dots: true },
  { name: "RuPay", cls: "bg-[#fff] text-[#097939] ring-1 ring-[#097939]" },
  { name: "AMERICAN EXPRESS", cls: "bg-[#2e77bb] text-white text-[10px] tracking-wide" },
  { name: "Diners Club", cls: "bg-[#004a97] text-white" },
];

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <p className="font-display font-bold">{title}</p>
      <p className="mb-3 text-xs text-slate-500">{hint}</p>
      {children}
    </div>
  );
}

/** Everything Razorpay Checkout accepts, shown before payment. */
export function PaymentMethods({ banks, wallets, live }: { banks: string[]; wallets: string[]; live: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="UPI" hint="Pay instantly from any UPI app — tap your app on mobile, or scan a QR / enter your UPI ID on desktop.">
        <div className="flex flex-wrap gap-2">
          {UPI_APPS.map((a) => (
            <span key={a.name} className={cx("rounded-lg px-3 py-1.5 text-xs font-bold ring-1", a.cls)}>{a.name}</span>
          ))}
        </div>
      </Section>

      <Section title="Debit & credit cards" hint="All major networks, issued by any Indian or international bank. 3-D Secure / OTP verified.">
        <div className="flex flex-wrap gap-2">
          {CARD_NETWORKS.map((c) => (
            <span key={c.name} className={cx("inline-flex h-9 min-w-20 items-center justify-center gap-1 rounded-md px-3 text-xs font-extrabold shadow-sm", c.cls)}>
              {c.dots && (
                <span aria-hidden className="relative mr-1 inline-block h-3.5 w-5">
                  <span className="absolute left-0 size-3.5 rounded-full bg-[#eb001b]" />
                  <span className="absolute left-1.5 size-3.5 rounded-full bg-[#f79e1b] opacity-90" />
                </span>
              )}
              {c.name}
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {/* Illustrative card faces - never real card numbers */}
          {[
            { label: "Debit card", from: "from-[#334155]", to: "to-[#0f172a]" },
            { label: "Credit card", from: "from-[#4338ca]", to: "to-[#6d28d9]" },
          ].map((c) => (
            <div key={c.label} className={cx("flex aspect-[1.586] flex-col justify-between rounded-xl bg-gradient-to-br p-3 text-white shadow", c.from, c.to)}>
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">{c.label}</span>
              <span aria-hidden className="h-5 w-7 rounded bg-gradient-to-br from-amber-200 to-amber-400" />
              <span className="font-mono text-[11px] tracking-widest opacity-90">•••• •••• •••• ••••</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Net banking · ${banks.length} banks`} hint={live ? "Live list of banks enabled for net banking on our payment gateway." : "Major banks shown — the full list appears in the checkout window."}>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-brand-600">Show all banks</summary>
          <ul className="mt-3 grid max-h-64 gap-x-4 gap-y-1 overflow-y-auto text-sm text-slate-700 sm:grid-cols-2">
            {banks.map((b) => <li key={b} className="flex items-center gap-1.5"><span aria-hidden className="text-emerald-600">✓</span>{b}</li>)}
          </ul>
        </details>
      </Section>

      <Section title="Wallets" hint="Pay from your wallet balance.">
        <div className="flex flex-wrap gap-2">
          {wallets.map((w) => <span key={w} className="chip bg-slate-100 text-slate-700">{w}</span>)}
        </div>
      </Section>
    </div>
  );
}
