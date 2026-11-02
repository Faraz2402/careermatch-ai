import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RolePage } from "@/components/resume-examples/role-page";
import { publishedRoles, roleOf, samplesFor } from "@/lib/resume-examples/data";

type P = { params: Promise<{ category: string; role: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => publishedRoles().map((r) => ({ category: r.category, role: r.slug }));

const find = async (params: P["params"]) => {
  const p = await params;
  const r = roleOf(p.role);
  return r && r.category === p.category && samplesFor({ role: r.slug }).length ? r : null;
};

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const r = await find(params);
  if (!r) return {};
  return {
    title: `${r.name} Resume Examples & Writing Guide`,
    description: `Fictional ${r.name.toLowerCase()} resume and CV examples for the US, UK, Canada, Australia, Germany and India, at entry, mid and senior level, with a writing guide and PDF downloads.`,
    alternates: { canonical: `/resume-examples/${r.category}/${r.slug}` },
  };
}

export default async function RoleRoute({ params }: P) {
  const r = await find(params);
  if (!r) notFound();
  return <RolePage role={r} />;
}
