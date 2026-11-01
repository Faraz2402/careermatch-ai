import type { Metadata } from "next";
import Link from "next/link";
import { ContactBlock, LegalPage, type LegalSection } from "@/components/legal-page";
import { LAWS, LEGAL } from "@/lib/legal";
import { proPrices } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When and how CareerMatch AI refunds Pro passes under Indian law: 7-day refunds, duplicate and failed payments, timelines and how to ask.",
  alternates: { canonical: "/refund-policy" },
};

const Law = ({ k, children }: { k: keyof typeof LAWS; children: React.ReactNode }) => (
  <a href={LAWS[k].url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">{children}</a>
);
const ul = "list-disc space-y-2 pl-5";
const link = "font-medium text-brand-700 underline underline-offset-2";

function sections(): LegalSection[] {
  const p = proPrices();
  return [
    {
      id: "scope",
      title: "What this policy covers",
      body: (
        <>
          <p>
            This policy covers payments for the CareerMatch <b>Pro</b> pass, sold by {LEGAL.operator} and paid through Razorpay: currently ₹{p.monthly.toLocaleString("en-IN")} for 1
            month or ₹{p.yearly.toLocaleString("en-IN")} for 12 months, including any applicable taxes. The Free plan costs nothing, so there is nothing to refund.
          </p>
          <p>
            Pro is a digital service that starts as soon as your payment succeeds. It is a prepaid pass, not a subscription: it never renews automatically. How to stop using
            it is explained in our <Link href="/cancellation-policy" className={link}>Cancellation Policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: "full",
      title: "When you get a full refund",
      body: (
        <ul className={ul}>
          <li><b>Changed your mind within 7 days.</b> Ask within 7 days of payment and you get a full refund, as long as you have used no more than 5 AI actions on the pass.</li>
          <li><b>Charged twice.</b> A duplicate payment for the same pass is always refunded in full, whenever you notice it.</li>
          <li><b>Paid but Pro didn&rsquo;t start.</b> If money left your account but Pro wasn&rsquo;t activated and we can&rsquo;t activate it within 24 hours of you telling us, you get a full refund.</li>
          <li><b>Service not as described.</b> If Pro doesn&rsquo;t work as described on our pricing page and we can&rsquo;t fix it, you get a full refund within the 7 days, whatever you have used.</li>
        </ul>
      ),
    },
    {
      id: "failed",
      title: "Failed or pending payments",
      body: (
        <>
          <p>
            Sometimes money is debited but the payment fails or stays pending. These are reversed automatically by your bank and our payment gateway, without you needing to
            ask, within the timelines in the RBI&rsquo;s <Law k="rbiTat">circular on failed transactions</Law> (for example, the next working day for most UPI payments and
            within 5 working days for card payments).
          </p>
          <p>If the reversal is late, the RBI framework requires your bank to compensate you. Tell us too, with the transaction date and amount, and we&rsquo;ll help chase it.</p>
        </>
      ),
    },
    {
      id: "partial",
      title: "Partial refunds",
      body: (
        <ul className={ul}>
          <li>If Pro stops working as described after the first 7 days and we can&rsquo;t fix it within a reasonable time, we refund the unused part of your pass, worked out day by day.</li>
          <li>If we close your account without cause, or stop offering Pro, we refund the unused part of your pass the same way.</li>
        </ul>
      ),
    },
    {
      id: "not",
      title: "When a refund isn't due",
      body: (
        <>
          <ul className={ul}>
            <li>After 7 days from payment, when the service has worked as described.</li>
            <li>Within 7 days, if you have used more than 5 AI actions and the service has worked as described.</li>
            <li>If we suspend or close your account because you seriously broke our <Link href="/terms" className={link}>Terms of Service</Link>, except where the law requires a refund.</li>
          </ul>
          <p>Nothing in this policy limits your rights as a consumer under the <Law k="cpa">Consumer Protection Act, 2019</Law>.</p>
        </>
      ),
    },
    {
      id: "how",
      title: "How to ask for a refund",
      body: (
        <>
          <p>Email us from the address on your CareerMatch account at <a href={`mailto:${LEGAL.grievanceEmail}`} className={link}>{LEGAL.grievanceEmail}</a> with:</p>
          <ul className={ul}>
            <li>the Razorpay payment ID (it starts with <code>pay_</code> and is in your payment receipt email and in Settings → Payment history);</li>
            <li>the date and amount; and</li>
            <li>a line on why you&rsquo;re asking (not needed for a change of mind within 7 days).</li>
          </ul>
          <p>There is no fee to ask, and you don&rsquo;t need to delete your account.</p>
        </>
      ),
    },
    {
      id: "timeline",
      title: "How long it takes",
      body: (
        <ul className={ul}>
          <li>We acknowledge your request within 48 hours and decide within 7 working days.</li>
          <li>
            Approved refunds are started within 7 working days of approval and go back to the <b>original payment method</b> (the same UPI account, card or bank), as the
            RBI&rsquo;s <Law k="rbiPa">rules for payment gateways</Law> require. Your bank usually shows the credit within 5–7 working days after that.
          </li>
          <li>You get the full amount you paid, including taxes. We don&rsquo;t deduct payment-gateway charges.</li>
          <li>Pro ends on the day a full refund is approved. A partial refund ends Pro from the date it covers.</li>
        </ul>
      ),
    },
    {
      id: "escalate",
      title: "If you're not satisfied",
      body: (
        <>
          <p>
            Contact our Grievance Officer below first: we acknowledge within 48 hours and aim to resolve within 15 days, within the one month allowed by the{" "}
            <Law k="ecomRules">Consumer Protection (E-Commerce) Rules, 2020</Law>. You can also call the <Law k="nch">National Consumer Helpline (1915)</Law> or file a complaint
            online through <Law k="edaakhil">e-Daakhil</Law> with the Consumer Disputes Redressal Commission.
          </p>
          <ContactBlock />
        </>
      ),
    },
  ];
}

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      effective="1 November 2026"
      version="1.0"
      intro={<p>The short version: change your mind within 7 days and you get your money back, duplicate charges are always refunded, and failed payments are reversed automatically. The details, under Indian law, are below.</p>}
      sections={sections()}
      references={["cpa", "ecomRules", "rbiTat", "rbiPa", "contractAct", "nch", "edaakhil"]}
    />
  );
}
