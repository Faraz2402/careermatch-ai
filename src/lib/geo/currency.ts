// Local currency per country, with approximate (static) rates to USD. Used to
// show salary preferences in the user's currency and to compare them with
// listings, which are normalised to yearly USD. Rates are labelled "approx."
// wherever a converted figure is shown.

/** 1 unit of the currency in USD (approximate). */
export const FX_TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.13, CAD: 0.73, AUD: 0.66, NZD: 0.6, INR: 0.012, SGD: 0.74, HKD: 0.128, JPY: 0.0067, KRW: 0.00073, CNY: 0.138,
  MYR: 0.21, IDR: 0.000062, PHP: 0.017, THB: 0.028, VND: 0.00004, PKR: 0.0036, BDT: 0.0083, LKR: 0.0033, NPR: 0.0075, AED: 0.272, SAR: 0.267, QAR: 0.275,
  KWD: 3.25, BHD: 2.65, OMR: 2.6, ILS: 0.27, TRY: 0.029, EGP: 0.02, ZAR: 0.055, NGN: 0.00065, KES: 0.0077, GHS: 0.065, MAD: 0.1, BRL: 0.18, MXN: 0.055,
  ARS: 0.001, CLP: 0.00105, COP: 0.00024, PEN: 0.27, SEK: 0.095, NOK: 0.093, DKK: 0.145, ISK: 0.0072, PLN: 0.25, CZK: 0.043, HUF: 0.0027, RON: 0.22,
};

const EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM VA ME XK".split(" ");
const BY_COUNTRY: Record<string, string> = {
  IN: "INR", US: "USD", PR: "USD", GB: "GBP", CH: "CHF", LI: "CHF", CA: "CAD", AU: "AUD", NZ: "NZD", SG: "SGD", HK: "HKD", JP: "JPY", KR: "KRW", CN: "CNY",
  MY: "MYR", ID: "IDR", PH: "PHP", TH: "THB", VN: "VND", PK: "PKR", BD: "BDT", LK: "LKR", NP: "NPR", AE: "AED", SA: "SAR", QA: "QAR", KW: "KWD", BH: "BHD",
  OM: "OMR", IL: "ILS", TR: "TRY", EG: "EGP", ZA: "ZAR", NG: "NGN", KE: "KES", GH: "GHS", MA: "MAD", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP", CO: "COP",
  PE: "PEN", SE: "SEK", NO: "NOK", DK: "DKK", IS: "ISK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", EC: "USD", SV: "USD", PA: "USD",
  ...Object.fromEntries(EURO.map((c) => [c, "EUR"])),
};

/** The currency used in a country (USD where we have no rate for its own currency). */
export const currencyForCountry = (code: string | null | undefined) => BY_COUNTRY[(code ?? "").toUpperCase()] ?? "USD";

export const currencySymbol = (cur: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: cur, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((p) => p.type === "currency")?.value ?? cur;
  } catch {
    return cur;
  }
};

/** Convert an amount between currencies (approximate). */
export function convertCurrency(amount: number, from: string, to: string) {
  const a = FX_TO_USD[from.toUpperCase()];
  const b = FX_TO_USD[to.toUpperCase()];
  if (!a || !b || from === to) return amount;
  return (amount * a) / b;
}

/** Yearly amount in the currency's usual style: ₹25 LPA / ₹1.2 Cr for INR, else ₹/$/€ with k/M. */
export function formatYearly(amount: number, cur: string) {
  const sym = currencySymbol(cur);
  if (cur === "INR") return amount >= 1e7 ? `${sym}${+(amount / 1e7).toFixed(2)} Cr a year` : `${sym}${+(amount / 1e5).toFixed(1)} LPA`;
  if (amount >= 1e6) return `${sym}${+(amount / 1e6).toFixed(2)}M a year`;
  if (amount >= 1e3) return `${sym}${+(amount / 1e3).toFixed(0)}k a year`;
  return `${sym}${amount} a year`;
}
