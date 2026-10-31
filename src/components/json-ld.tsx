import { proPrices } from "@/lib/billing";
import { appUrl } from "@/lib/site-url";

/** schema.org structured data for search engines ("<" escaped so text can't close the tag). */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** CareerMatch as a free web app with ₹ Pro passes; shared by the homepage and pricing. */
export function softwareApplication() {
  const base = appUrl();
  const p = proPrices();
  return {
    "@type": "SoftwareApplication",
    "@id": `${base}/#app`,
    name: "CareerMatch AI",
    url: `${base}/`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en-IN",
    image: `${base}/icon.png`,
    description:
      "AI job-search assistant: reads your résumé, ranks jobs with explained match scores and skill gaps, finds employer apply links and market salaries, and writes tailored résumés and cover letters.",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "INR", url: `${base}/pricing` },
      { "@type": "Offer", name: "Pro · 1 month", price: String(p.monthly), priceCurrency: "INR", url: `${base}/pricing` },
      { "@type": "Offer", name: "Pro · 12 months", price: String(p.yearly), priceCurrency: "INR", url: `${base}/pricing` },
    ],
  };
}

export function organization() {
  const base = appUrl();
  return {
    "@type": "Organization",
    "@id": `${base}/#org`,
    name: "CareerMatch AI",
    url: `${base}/`,
    logo: `${base}/icon.png`,
  };
}
