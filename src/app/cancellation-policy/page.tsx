import type { Metadata } from "next";
import Link from "next/link";
import { ContactBlock, LegalPage, type LegalSection } from "@/components/legal-page";
import { LAWS, LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "How to cancel CareerMatch AI under Indian law: no auto-renewal, no cancellation fees, cancelling Pro within 7 days, deleting your account, and cancellations by us.",
  alternates: { canonical: "/cancellation-policy" },
};

const Law = ({ k, children }: { k: keyof typeof LAWS; children: React.ReactNode }) => (
  <a href={LAWS[k].url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">{children}</a>
);
const ul = "list-disc space-y-2 pl-5";
const link = "font-medium text-brand-700 underline underline-offset-2";
const refund = <Link href="/refund-policy" className={link}>Refund Policy</Link>;

function sections(): LegalSection[] {
  return [
    {
      id: "summary",
      title: "Nothing renews, so nothing traps you",
      body: (
        <ul className={ul}>
          <li>The Pro pass is <b>prepaid</b> for 1 or 12 months. It does <b>not</b> renew automatically, and we never set up an e-mandate, standing instruction or autopay.</li>
          <li>So you never need to cancel to stop future charges: if you don&rsquo;t buy again, you won&rsquo;t be charged again.</li>
          <li>We never charge a cancellation fee, as the <Law k="ecomRules">Consumer Protection (E-Commerce) Rules, 2020</Law> (rule 4(10)) require.</li>
        </ul>
      ),
    },
    {
      id: "free",
      title: "Cancelling the Free plan",
      body: <p>Stop using CareerMatch whenever you like, or delete your account in <b>Settings → Delete account</b>. It costs nothing.</p>,
    },
    {
      id: "pro",
      title: "Cancelling a Pro pass",
      body: (
        <ul className={ul}>
          <li><b>Before you pay:</b> just close the Razorpay checkout. Nothing is charged. If money was debited anyway, it&rsquo;s a failed payment and is reversed automatically, as explained in our {refund}.</li>
          <li><b>Within 7 days of paying:</b> email us to cancel and you get a full refund, as long as you have used no more than 5 AI actions. See the {refund} for the details and timelines.</li>
          <li><b>After 7 days:</b> you can stop using Pro at any time. It stays active until the end of the period you paid for, and you won&rsquo;t be charged again. The unused days aren&rsquo;t refunded unless the service hasn&rsquo;t worked as described; then the {refund} applies.</li>
        </ul>
      ),
    },
    {
      id: "how",
      title: "How to cancel",
      body: (
        <>
          <p>
            Email <a href={`mailto:${LEGAL.grievanceEmail}`} className={link}>{LEGAL.grievanceEmail}</a> from the address on your account, with your Razorpay payment ID (it starts
            with <code>pay_</code>). We confirm the cancellation within 48 hours. There is no form to fill in and no fee.
          </p>
        </>
      ),
    },
    {
      id: "delete",
      title: "Deleting your account",
      body: (
        <ul className={ul}>
          <li>You can delete your account at any time in Settings. Your résumé, documents and other data are erased as our <Link href="/privacy" className={link}>Privacy Policy</Link> describes.</li>
          <li>Deleting your account ends any Pro pass. If you&rsquo;re still within 7 days of paying, ask for your refund first so we can match the payment to your account quickly.</li>
          <li>We keep payment records for as long as tax and accounting laws require, even after deletion.</li>
        </ul>
      ),
    },
    {
      id: "by-us",
      title: "Cancellations by us",
      body: (
        <ul className={ul}>
          <li>If we close your account without cause, or stop offering Pro, we refund the unused part of your pass, worked out day by day.</li>
          <li>If you seriously break our <Link href="/terms" className={link}>Terms of Service</Link>, we may suspend or close your account. We tell you why unless the law or safety prevents it. A refund is then due only where the law requires one.</li>
          <li>Changes to prices or plan limits never affect a pass you have already bought.</li>
        </ul>
      ),
    },
    {
      id: "rights",
      title: "Your rights and contact",
      body: (
        <>
          <p>
            Nothing in this policy limits your rights under the <Law k="cpa">Consumer Protection Act, 2019</Law>. If you&rsquo;re not satisfied, contact our Grievance Officer
            below; you can also call the <Law k="nch">National Consumer Helpline (1915)</Law> or file online through <Law k="edaakhil">e-Daakhil</Law>.
          </p>
          <ContactBlock />
        </>
      ),
    },
  ];
}

export default function CancellationPolicyPage() {
  return (
    <LegalPage
      title="Cancellation Policy"
      effective="1 November 2026"
      version="1.0"
      intro={<p>The short version: Pro never renews on its own, so there&rsquo;s nothing to cancel to stop charges. Cancel within 7 days for a full refund, there are no cancellation fees, and you can delete your account any time.</p>}
      sections={sections()}
      references={["cpa", "ecomRules", "contractAct", "nch", "edaakhil"]}
    />
  );
}
