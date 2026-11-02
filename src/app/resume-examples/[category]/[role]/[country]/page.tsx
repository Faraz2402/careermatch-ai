import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RolePage } from "@/components/resume-examples/role-page";
import { COUNTRY_NAMES, COUNTRY_SLUGS, countryFromSlug, formatFor, LEVEL_LABEL, roleOf, samplesFor, termFor } from "@/lib/resume-examples/data";

type P = { params: Promise<{ category: string; role: string; country: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => samplesFor({}).map((s) => ({ category: s.category, role: s.role, country: COUNTRY_SLUGS[s.country] }));

const find = async (params: P["params"]) => {
  const p = await params;
  const r = roleOf(p.role);
  const c = countryFromSlug(p.country);
  const s = r && c && r.category === p.category ? samplesFor({ role: r.slug, country: c })[0] : undefined;
  return s && r && c ? { r, c, s } : null;
};

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const f = await find(params);
  if (!f) return {};
  const term = termFor(f.c);
  return {
    title: `${f.r.name} ${term} Example for ${COUNTRY_NAMES[f.c]}`,
    description: `A fictional ${LEVEL_LABEL[f.s.level].toLowerCase()} ${f.r.name.toLowerCase()} ${term} for ${COUNTRY_NAMES[f.c]}: local qualifications, ${formatFor(f.c).paper} format and country-specific tips. Free PDF download.`,
    alternates: { canonical: `/resume-examples/${f.r.category}/${f.r.slug}/${COUNTRY_SLUGS[f.c]}` },
  };
}

export default async function RoleCountryRoute({ params }: P) {
  const f = await find(params);
  if (!f) notFound();
  return <RolePage role={f.r} country={f.c} />;
}
