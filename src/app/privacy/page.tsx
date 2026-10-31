import type { Metadata } from "next";
import Link from "next/link";
import { ContactBlock, LegalPage, type LegalSection } from "@/components/legal-page";
import { LAWS, LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CareerMatch AI collects, uses, shares and protects your personal data under India's DPDP Act 2023 and IT Act 2000.",
  alternates: { canonical: "/privacy" },
};

const Law = ({ k, children }: { k: keyof typeof LAWS; children: React.ReactNode }) => (
  <a href={LAWS[k].url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2">{children}</a>
);

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-slate-100 text-xs text-slate-600 uppercase">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold tracking-wide">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">{r.map((c, j) => <td key={j} className={`px-4 py-3 ${j === 0 ? "font-medium text-slate-900" : "text-slate-700"}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ul = "list-disc space-y-2 pl-5";

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          CareerMatch AI (&ldquo;<b>CareerMatch</b>&rdquo;, &ldquo;<b>we</b>&rdquo;, &ldquo;<b>us</b>&rdquo;) is a job-search service operated by <b>{LEGAL.operator}</b>. It reads your
          résumé, builds a profile, ranks job listings against it and helps you prepare applications.
        </p>
        <p>
          For the personal data you give us, we are the <b>Data Fiduciary</b> under section 2(i) of the <Law k="dpdpAct">Digital Personal Data Protection Act, 2023</Law> (&ldquo;DPDP Act&rdquo;),
          and a <b>body corporate</b> handling information under section 43A of the <Law k="itAct">Information Technology Act, 2000</Law>. You are the <b>Data Principal</b>.
        </p>
      </>
    ),
  },
  {
    id: "laws",
    title: "Laws this policy follows",
    body: (
      <>
        <p>We operate in India and wrote this policy to meet:</p>
        <ul className={ul}>
          <li>the <Law k="dpdpAct">DPDP Act, 2023</Law> and the <Law k="dpdpRules">DPDP Rules, 2025</Law>. Most of the Rules&rsquo; obligations take effect on 13 May 2027 (rule 1(4)); we already follow them where we can;</li>
          <li>the <Law k="itAct">IT Act, 2000</Law> and the <Law k="spdiRules">IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</Law>, which continue to apply until the DPDP Act&rsquo;s provisions replace them;</li>
          <li>the <Law k="intermediaryRules">IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</Law>, for the profiles you choose to publish;</li>
          <li>the <Law k="certIn">CERT-In Directions of 28 April 2022</Law> on reporting cyber-security incidents; and</li>
          <li>the <Law k="cpa">Consumer Protection Act, 2019</Law> and <Law k="ecomRules">Consumer Protection (E-Commerce) Rules, 2020</Law>, for paid plans.</li>
        </ul>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "Personal data we collect, and where it comes from",
    body: (
      <>
        <p>We collect only what the service needs. Each item below shows its source.</p>
        <Table
          head={["Data", "Examples", "Where it comes from"]}
          rows={[
            ["Account", "Name, email address, password (stored only as a bcrypt hash)", "You, when you sign up"],
            ["Social sign-in", "Name, email address, account ID, and whether the provider has verified your email", "Google, Microsoft or LinkedIn, only if you choose to sign in with them"],
            ["Résumé and profile", "The file text and the details read from it: work history, education, skills, certifications, links, contact details you include", "You upload or paste it; AI turns the text into an editable profile"],
            ["Job preferences", "Target roles, locations, salary range, work arrangement, work authorisation, need for sponsorship", "You"],
            ["Job activity", "Saved and hidden jobs, application status, notes, follow-up dates, recruiter names and emails you add", "You"],
            ["Documents you generate", "Tailored résumés, cover letters, match analyses, interview answers", "Created by AI from your profile and the job, at your request"],
            ["Payments", "Order and payment IDs, amount, pass type, payment method type (e.g. UPI, card)", "Razorpay, after you pay. We never receive or store card numbers, CVV, UPI PIN or bank passwords"],
            ["Technical", "IP address, browser user-agent, session cookie", "Your browser, automatically"],
            ["Emails", "Confirmation, password-reset and job-alert emails we send you", "Generated by us"],
          ]}
        />
        <p>
          <b>Sensitive personal data.</b> We do not ask for passwords to other services, financial account or card details, health, biometric, caste, religion or government ID
          numbers (such as Aadhaar or PAN). Please leave these out of the résumé you upload. If your résumé contains them, they are stored encrypted with the rest of it.
        </p>
      </>
    ),
  },
  {
    id: "other-sources",
    title: "Data we get from other sources",
    body: (
      <>
        <p>To find and explain jobs, we use information that is not about you:</p>
        <ul className={ul}>
          <li>
            <b>Job listings</b> come only from official APIs and public employer feeds: Adzuna, Careerjet, Jooble, Remotive and Arbeitnow, plus employers&rsquo;
            boards on Greenhouse, Lever and Ashby. Each listing shows its source and when it was last seen. We do not scrape sites that need a login, bypass CAPTCHAs, or ignore
            robots.txt.
          </li>
          <li>
            <b>Original postings.</b> When you open a job, we search the web for the employer&rsquo;s own posting, using Google Search through Google&rsquo;s Gemini API and the Tavily
            search API. We open the employer&rsquo;s page only where its robots.txt allows. These searches contain the job&rsquo;s title, company and location, never your
            personal data.
          </li>
          <li>
            <b>Market salaries</b> are figures that sites such as AmbitionBox, Glassdoor, 6figr, PayScale and Indeed publish, as they appear in search results. We link to each
            source and do not scrape those sites.
          </li>
          <li>
            <b>Links to LinkedIn, Naukri and other boards</b> are found the same way. We only link to them; we never read or copy those pages.
          </li>
        </ul>
        <p>Job listings may name a recruiter or hiring manager. That information was published by the employer or job board, and we show it only as part of the listing.</p>
      </>
    ),
  },
  {
    id: "purposes",
    title: "Why we use your data, and on what basis",
    body: (
      <>
        <p>
          We process your personal data with your <b>consent</b> (DPDP Act, section 6), which you give when you create an account and upload your résumé, and for the
          specified purpose you provide it for (section 7(a)). We use it to:
        </p>
        <ul className={ul}>
          <li>create your account, keep you signed in and secure it (including rate limiting by IP address);</li>
          <li>read your résumé into a profile, score and explain job matches, and find original postings;</li>
          <li>generate tailored résumés, cover letters, interview practice and match analyses when you ask;</li>
          <li>publish your profile page, only if you turn publishing on, and only the sections you choose;</li>
          <li>send account emails and the job alerts you set up;</li>
          <li>process payments for Pro passes and keep records required by tax and consumer law;</li>
          <li>meet legal obligations, such as responding to lawful requests and reporting security incidents.</li>
        </ul>
        <p>We do <b>not</b> sell your data, use it for advertising, or build profiles of you for anyone else.</p>
      </>
    ),
  },
  {
    id: "ai",
    title: "How AI is used",
    body: (
      <>
        <ul className={ul}>
          <li>To read résumés and job postings and to write documents, we send the relevant text to an AI provider: Google (Gemini API), and Anthropic (Claude) if enabled. If AI search ranking is enabled, Voyage AI turns text into number vectors.</li>
          <li>These providers process the text to return a result under their API terms. We do not use your data to train any model.</li>
          <li>Match scores are produced by our own rules from your profile and the listing. Every point is explained on screen. They are guidance for you only; no decision about you is made automatically, and we do not share scores with employers.</li>
          <li>AI output can be wrong. Review everything before you use it. Generated documents only rephrase facts from your own profile.</li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    body: (
      <>
        <p>
          We use the following <b>Data Processors</b> (DPDP Act, section 8(2)), each under contract, to run the service. They may process your data only to provide their
          service to us.
        </p>
        <Table
          head={["Provider", "What it does", "Data involved", "Location"]}
          rows={[
            ["Vercel Inc.", "Hosts the website and runs the server", "All data passing through the site", "Servers in Singapore; company in the USA"],
            ["Neon", "Database", "Everything stored in your account", "Singapore (AWS ap-southeast-1)"],
            ["Google LLC", "Gemini AI and Google Search; Google sign-in if you use it", "Résumé and job text sent for AI; sign-in profile", "USA and global"],
            ["Anthropic PBC (if enabled)", "Claude AI", "Résumé and job text sent for AI", "USA"],
            ["Voyage AI (if enabled)", "Text embeddings for ranking", "Profile summary and job text", "USA"],
            ["Tavily", "Web search for original postings and salaries", "Job title, company, location (no personal data)", "USA"],
            ["Resend", "Sends our emails", "Your email address and the email content", "USA"],
            ["Razorpay Software Pvt. Ltd.", "Takes payments", "Payment details you enter on Razorpay's checkout", "India"],
            ["Microsoft, LinkedIn", "Sign-in, only if you use them", "Sign-in profile", "USA and global"],
          ]}
        />
        <p>
          We also share data when you ask us to (for example, by publishing your profile or clicking an apply link), and when Indian law requires it, such as a court order
          or a lawful request from a government agency under section 69 or 79 of the IT Act. If the service is ever sold or merged, your data would move only under this
          policy, and we would tell you first.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Transfers outside India",
    body: (
      <p>
        Our database and servers are in Singapore, and some processors are in the USA. Section 16 of the DPDP Act allows transfers outside India except to countries the
        Central Government restricts by notification; none of these countries is restricted. Each provider protects the data with encryption and contractual safeguards.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <Table
          head={["Data", "Kept for"]}
          rows={[
            ["Your account, profile, résumé and documents", "Until you delete them or your account. Deleting your account erases them straight away"],
            ["Sign-in sessions", "14 days, or until you sign out"],
            ["Password-reset and email-confirmation links", "Until used or expired, then deleted within a day"],
            ["Demo accounts", "Deleted automatically after 24 hours"],
            ["Job listings you haven't saved or acted on", "Deleted 30 days after the source last listed them"],
            ["Copies of emails in our outbox", "7 days"],
            ["Payment records", "As long as Indian tax and accounting laws require"],
            ["Backups and server logs", "Short rolling periods kept by our hosting and database providers, then overwritten"],
          ]}
        />
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <>
        <ul className={ul}>
          <li>Your résumé text, profile and generated documents are encrypted in the database with AES-256-GCM.</li>
          <li>All traffic uses HTTPS (TLS). Passwords are stored only as bcrypt hashes, and session tokens are stored hashed.</li>
          <li>Sign-in cookies are HTTP-only and secure, and requests are rate-limited to stop abuse.</li>
          <li>Only the operator can access production systems, and access is limited to what is needed.</li>
        </ul>
        <p>
          These are the &ldquo;reasonable security practices&rdquo; required by section 43A of the IT Act and rule 8 of the SPDI Rules, and the safeguards in section 8(5) of the
          DPDP Act and rule 6 of the DPDP Rules. If a breach affects your data, we will tell you and the Data Protection Board of India without delay (section 8(6) and rule 7).
          We will report the incident to CERT-In within 6 hours, as its Directions require.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <p>Under Chapter III of the DPDP Act you can:</p>
        <ul className={ul}>
          <li><b>Access</b> a summary of your data and how we process it (section 11): use <i>Settings → Download all my data</i> for a full copy;</li>
          <li><b>Correct, complete or update</b> it (section 12): edit your profile at any time;</li>
          <li><b>Erase</b> it (section 12): delete documents, résumé versions or your whole account in <i>Settings</i>;</li>
          <li><b>Withdraw consent</b> at any time (section 6(4)), as easily as you gave it. We will stop processing, though anything we already did stays lawful;</li>
          <li><b>Nominate</b> someone to exercise these rights if you die or cannot act (section 14);</li>
          <li><b>Raise a grievance</b> with us (section 13), and if it isn&rsquo;t resolved, complain to the <b>Data Protection Board of India</b>.</li>
        </ul>
        <p>
          For anything you can&rsquo;t do in Settings, email the Grievance Officer below. We acknowledge within 24 hours and resolve within 15 days, as rule 3(2) of the IT Rules
          2021 requires. Under the DPDP Rules the maximum is 90 days.
        </p>
      </>
    ),
  },
  {
    id: "duties",
    title: "Your duties",
    body: (
      <p>
        Section 15 of the DPDP Act asks you to give accurate information, not impersonate anyone, and not file false complaints. Only upload a résumé that is your own, and
        add other people&rsquo;s details (for example, a recruiter&rsquo;s email) only for your own job search.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        CareerMatch is for people aged 18 and over. Section 9 of the DPDP Act requires verifiable parental consent for anyone under 18, which we do not collect, so we do
        not knowingly allow children to use the service. If you believe a child has signed up, contact us and we will delete the account.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    body: (
      <>
        <Table
          head={["Name", "Purpose", "Lasts"]}
          rows={[
            ["cm_session", "Keeps you signed in (essential)", "14 days"],
            ["cm_oauth", "Protects Google / Microsoft / LinkedIn sign-in from forgery (essential)", "10 minutes"],
            ["cm-theme (local storage)", "Remembers your light or dark theme", "Until you clear it"],
          ]}
        />
        <p>We use no advertising, tracking or third-party analytics cookies.</p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we make a material change, we will update the date at the top and tell signed-in users by email or in the app before it takes effect. If the change needs fresh
        consent, we will ask for it.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact and Grievance Officer",
    body: (
      <>
        <p>Questions, requests or complaints about your data:</p>
        <ContactBlock />
        <p>
          You can also use the same contact for anything under our <Link href="/terms" className="font-medium text-brand-700 underline underline-offset-2">Terms of Service</Link>.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal data CareerMatch AI collects, where it comes from, why we use it, who we share it with, how long we keep it, and the rights you
          have under Indian law. Plain summaries come first; the legal basis follows in each section.
        </p>
      }
      sections={SECTIONS}
      references={["dpdpAct", "dpdpRules", "itAct", "spdiRules", "intermediaryRules", "certIn", "cpa", "ecomRules"]}
    />
  );
}
