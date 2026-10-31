import type { Metadata } from "next";
import Link from "next/link";
import { ContactBlock, LegalPage, type LegalSection } from "@/components/legal-page";
import { LAWS, LEGAL } from "@/lib/legal";
import { proPrices } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using CareerMatch AI, under Indian law: accounts, acceptable use, AI content, paid passes and refunds, liability and grievances.",
  alternates: { canonical: "/terms" },
};

const Law = ({ k, children }: { k: keyof typeof LAWS; children: React.ReactNode }) => (
  <a href={LAWS[k].url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">{children}</a>
);
const ul = "list-disc space-y-2 pl-5";
const privacy = <Link href="/privacy" className="font-medium text-brand-700 underline underline-offset-2">Privacy Policy</Link>;

function sections(): LegalSection[] {
  const p = proPrices();
  const courts = LEGAL.jurisdiction ? `the courts at ${LEGAL.jurisdiction}` : "the competent courts in India";
  return [
    {
      id: "agreement",
      title: "Agreement",
      body: (
        <>
          <p>
            These Terms are a contract between you and <b>{LEGAL.operator}</b>, the operator of CareerMatch AI (&ldquo;CareerMatch&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
            By creating an account or using the service, you agree to them and to our {privacy}.
          </p>
          <p>
            They are an electronic record under section 10A of the <Law k="itAct">Information Technology Act, 2000</Law>, and a contract under the{" "}
            <Law k="contractAct">Indian Contract Act, 1872</Law>. No physical or digital signature is needed. If you do not agree, please do not use CareerMatch.
          </p>
        </>
      ),
    },
    {
      id: "eligibility",
      title: "Who can use CareerMatch",
      body: (
        <p>
          You must be at least 18 years old and able to enter a binding contract under section 11 of the Indian Contract Act. One person, one account. If you use
          CareerMatch for an organisation, you confirm you are authorised to accept these Terms for it.
        </p>
      ),
    },
    {
      id: "service",
      title: "What CareerMatch does, and doesn't do",
      body: (
        <>
          <p>CareerMatch reads your résumé, ranks job listings against it, finds original postings and helps you prepare applications.</p>
          <ul className={ul}>
            <li>
              We are <b>not</b> an employer, recruiter or placement agency. We do not apply for jobs on your behalf, and we do not guarantee interviews, offers or any
              outcome.
            </li>
            <li>
              Listings come from third-party sources such as job-board APIs and employer career sites. We show each listing&rsquo;s source and age, but we do not control,
              verify or endorse the employers or their jobs. Listings may be filled, changed or withdrawn without notice.
            </li>
            <li>Match scores, skill gaps and salary figures are guidance to help you decide. They are not professional, financial or career advice.</li>
          </ul>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <b>Beware of job fraud.</b> Genuine employers do not ask for money to apply, interview or be hired. Never pay a &ldquo;registration&rdquo; or &ldquo;processing&rdquo;
            fee, or share OTPs or bank details. Report suspicious listings to us and at <a className="underline" href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">cybercrime.gov.in</a> or helpline 1930.
          </p>
        </>
      ),
    },
    {
      id: "account",
      title: "Your account",
      body: (
        <ul className={ul}>
          <li>Give accurate information and keep it up to date.</li>
          <li>Keep your password and sign-in methods secure. You are responsible for activity on your account; tell us at once if you suspect misuse.</li>
          <li>You can delete your account at any time in Settings. This erases your data as described in our {privacy}.</li>
        </ul>
      ),
    },
    {
      id: "your-content",
      title: "Your content",
      body: (
        <>
          <p>
            You own your résumé, profile and everything you write or generate in CareerMatch. You give us a limited, non-exclusive, royalty-free licence to store, process
            and display it, only to provide the service to you. That includes sending text to our AI providers, and showing your public profile if you choose to publish
            it. The licence ends when you delete the content or your account, except for copies we must keep by law.
          </p>
          <p>You confirm you have the right to upload your content, and that it is truthful and does not infringe anyone else&rsquo;s rights.</p>
        </>
      ),
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      body: (
        <>
          <p>
            As rule 3(1)(b) of the <Law k="intermediaryRules">IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</Law> requires, you must not host,
            display, upload, publish or share anything that:
          </p>
          <ul className={ul}>
            <li>belongs to someone else and you have no right to;</li>
            <li>is obscene, pornographic, paedophilic, invasive of another&rsquo;s privacy (including bodily privacy), insulting or harassing on the basis of gender, racially or ethnically objectionable, or encourages money laundering or gambling;</li>
            <li>is harmful to children;</li>
            <li>infringes any patent, trademark, copyright or other proprietary right;</li>
            <li>deceives or misleads about where a message came from, or knowingly spreads false or misleading information;</li>
            <li>impersonates another person;</li>
            <li>threatens the unity, integrity, defence, security or sovereignty of India, friendly relations with foreign states, or public order, or incites an offence;</li>
            <li>contains malware or any code designed to interrupt, destroy or limit a computer resource; or</li>
            <li>breaks any law in force.</li>
          </ul>
          <p>You also must not:</p>
          <ul className={ul}>
            <li>scrape, copy or resell listings or other data from CareerMatch, or access it by automated means other than our published features;</li>
            <li>try to break or bypass our security, rate limits or plan limits, or another person&rsquo;s account;</li>
            <li>upload someone else&rsquo;s résumé without their permission, or use CareerMatch to spam employers or recruiters;</li>
            <li>misrepresent your qualifications in applications you prepare with CareerMatch.</li>
          </ul>
        </>
      ),
    },
    {
      id: "ai",
      title: "AI-generated content",
      body: (
        <ul className={ul}>
          <li>CareerMatch uses AI to read résumés, analyse jobs and draft documents. AI can make mistakes, so check every result before you rely on it or send it.</li>
          <li>Our tools rephrase and organise facts from your own profile; they are designed not to invent experience. You are responsible for making sure anything you send to an employer is true.</li>
          <li>You own the documents you generate, and may use them freely for your job search.</li>
        </ul>
      ),
    },
    {
      id: "payments",
      title: "Plans, payments and refunds",
      body: (
        <>
          <p>
            CareerMatch is free to use within the limits shown on our <Link href="/pricing" className="font-medium text-brand-700 underline underline-offset-2">pricing page</Link>.
            The <b>Pro</b> plan is a prepaid pass: currently ₹{p.monthly.toLocaleString("en-IN")} for 1 month or ₹{p.yearly.toLocaleString("en-IN")} for 12 months, inclusive of
            any applicable taxes. Prices are always shown before you pay.
          </p>
          <ul className={ul}>
            <li>Payments are processed by Razorpay (UPI, cards, net banking and wallets). We never see or store your card number, CVV, UPI PIN or banking password.</li>
            <li>Passes do <b>not</b> renew automatically and nothing is debited without your action. Buying again extends your current pass.</li>
            <li>
              <b>Refunds:</b> if the Pro pass does not work as described, ask for a refund within <b>7 days</b> of payment. A full refund is due if you have used no more than 5 AI
              actions. Payments made twice by mistake are always refunded. Approved refunds go back to the original payment method within 7 working days of approval.
            </li>
            <li>We may change prices or plan limits in future; changes never affect a pass you have already bought.</li>
          </ul>
          <p>
            These terms are meant to meet the <Law k="cpa">Consumer Protection Act, 2019</Law> and the <Law k="ecomRules">Consumer Protection (E-Commerce) Rules, 2020</Law>,
            and nothing in them limits your rights as a consumer under those laws.
          </p>
        </>
      ),
    },
    {
      id: "ip",
      title: "Our intellectual property",
      body: (
        <p>
          The CareerMatch name, logo, design, software and written content belong to {LEGAL.operator} or its licensors. You may use the service as these Terms allow, but you
          may not copy, modify, reverse-engineer or redistribute it. Job listings belong to their publishers and are shown with attribution under each source&rsquo;s terms.
        </p>
      ),
    },
    {
      id: "third-parties",
      title: "Third-party sites and services",
      body: (
        <p>
          CareerMatch links to employer career sites, LinkedIn, Naukri, other job boards and salary sites, and relies on providers such as Google, Razorpay and Vercel. Their
          own terms and privacy policies apply when you use them, and we are not responsible for their content or conduct.
        </p>
      ),
    },
    {
      id: "takedown",
      title: "Complaints about content",
      body: (
        <p>
          If something on CareerMatch, such as a published profile, breaks the law or these Terms, or infringes your rights, tell the Grievance Officer below. We act on
          complaints and on orders from a court or authorised government agency within the time limits set by rule 3 of the IT Rules, 2021. We may remove the content,
          suspend accounts, and keep relevant records for the period the Rules require.
        </p>
      ),
    },
    {
      id: "termination",
      title: "Suspension and termination",
      body: (
        <p>
          You may stop using CareerMatch and delete your account at any time. We may suspend or end an account that breaks these Terms or the law, or puts others at risk.
          We will tell you why unless the law or safety prevents it. If we end your account without cause, we will refund the unused part of any Pro pass.
        </p>
      ),
    },
    {
      id: "disclaimers",
      title: "Disclaimers and limitation of liability",
      body: (
        <>
          <p>
            CareerMatch is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we do not promise that it will be uninterrupted or
            error-free, or that listings, scores, salaries or AI output are accurate or complete.
          </p>
          <p>
            To the extent the law allows, we are not liable for indirect or consequential losses, such as lost opportunities, earnings or data. Our total liability to you
            for any claim is limited to the amount you paid us in the 12 months before the claim, or ₹1,000 if you paid nothing. Nothing here limits liability that cannot be
            limited under Indian law, including for fraud or gross negligence.
          </p>
        </>
      ),
    },
    {
      id: "indemnity",
      title: "Indemnity",
      body: (
        <p>
          You agree to compensate us for losses and reasonable legal costs from claims by third parties caused by your content, your breach of these Terms, or your misuse
          of the service.
        </p>
      ),
    },
    {
      id: "law",
      title: "Governing law and disputes",
      body: (
        <p>
          These Terms are governed by the laws of India. We would like to resolve any dispute informally first: please contact the Grievance Officer. Otherwise, disputes
          are subject to the exclusive jurisdiction of {courts}. This does not affect your right as a consumer to approach a Consumer Disputes Redressal Commission under the
          Consumer Protection Act, 2019.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      body: (
        <p>
          We may update these Terms as the service or the law changes. For material changes, we will update the date above and notify signed-in users before they take
          effect. If you keep using CareerMatch after that, you accept the new Terms.
        </p>
      ),
    },
    {
      id: "grievance",
      title: "Grievance Officer and contact",
      body: (
        <>
          <p>
            As required by rule 3(2) of the IT Rules, 2021 and rule 4 of the Consumer Protection (E-Commerce) Rules, 2020, complaints go to our Grievance Officer. We
            acknowledge within 24 hours and resolve within 15 days.
          </p>
          <ContactBlock />
        </>
      ),
    },
  ];
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>These Terms explain the rules for using CareerMatch AI: what we provide, what we expect from you, how paid passes and refunds work, and how disputes are resolved under Indian law.</p>}
      sections={sections()}
      references={["contractAct", "itAct", "intermediaryRules", "cpa", "ecomRules", "dpdpAct"]}
    />
  );
}
