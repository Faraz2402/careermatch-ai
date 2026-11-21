import {
  Bell, BookOpenCheck, Bookmark, BriefcaseBusiness, ClipboardCheck, FileDown, FileText, Files, Gauge, Globe2, IndianRupee, KanbanSquare,
  Link2, ListChecks, Mail, MessagesSquare, Mic, PenLine, Search, ShieldCheck, Sparkles, Upload, UserRound, type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type Feature = { icon: LucideIcon; title: string; body: string };
type Group = { id: string; name: string; title: string; intro: string; tone: string; features: Feature[]; preview: React.ReactNode };

const v = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** A score ring that draws itself on a loop. */
function Ring({ value, i }: { value: number; i: number }) {
  const r = 15, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="size-10 -rotate-90" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="4" className="stroke-forest/10" />
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="4" strokeLinecap="round" className="loop-ring stroke-leaf" strokeDasharray={c}
        style={{ "--full": c, "--rest": c * (1 - value / 100), "--i": i } as React.CSSProperties} />
    </svg>
  );
}

const FindPreview = (
  <div className="w-full max-w-sm space-y-3">
    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
      {["Procurement", "Hyderabad", "Hybrid", "Past week"].map((c, k) => <span key={c} className="loop-pop rounded-full bg-white px-2.5 py-1 text-forest" style={v(k)}>{c}</span>)}
    </div>
    {[["Senior Procurement Analyst", "Bengaluru · Hybrid", 86], ["Sourcing Specialist", "Hyderabad · On-site", 78], ["Category Buyer", "Pune · Remote", 71]].map(([t, w, s], k) => (
      <div key={t as string} className="loop-rise flex items-center gap-3 rounded-2xl bg-white p-3 text-forest-deep shadow-[0_12px_30px_-20px_rgb(7_33_26/0.6)]" style={v(k + 1)}>
        <div className="relative grid place-items-center"><Ring value={s as number} i={k + 1} /><span className="absolute text-[11px] font-bold">{s}</span></div>
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{t}</p><p className="text-xs text-forest/60">{w}</p></div>
      </div>
    ))}
  </div>
);

const ApplyPreview = (
  <div className="flex w-full max-w-sm gap-4">
    <div className="flex-1 rounded-2xl bg-white p-4 shadow-[0_12px_30px_-20px_rgb(7_33_26/0.6)]">
      <div className="h-3 w-2/3 rounded bg-forest-deep" />
      <div className="mt-1.5 h-2 w-1/2 rounded bg-forest/30" />
      <div className="mt-4 space-y-2">
        {[1, 0.9, 0.95, 0.7, 0.85, 0.6].map((w, k) => <div key={k} className="loop-write h-2 rounded bg-forest/20" style={{ width: `${w * 100}%`, ...v(k) }} />)}
      </div>
      <div className="mt-3 flex gap-1">{["Power BI", "SAP"].map((s, k) => <span key={s} className="loop-pop rounded bg-mintwash px-1.5 py-0.5 text-[10px] font-semibold text-forest" style={v(k + 6)}>{s}</span>)}</div>
    </div>
    <div className="w-28 space-y-3">
      <div className="rounded-2xl bg-white p-3 text-forest-deep shadow-[0_12px_30px_-20px_rgb(7_33_26/0.6)]">
        <p className="text-[10px] text-forest/60">ATS alignment</p>
        <p className="text-lg font-bold tabular-nums">61 → 84</p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest/10"><div className="loop-bar h-full rounded-full bg-leaf" style={{ "--from": 0.61, "--to": 0.84 } as React.CSSProperties} /></div>
      </div>
      <div className="fan relative h-20">
        {["bg-peri", "bg-white", "bg-apricot"].map((c, k) => <div key={c} className={`absolute inset-x-3 top-0 h-20 rounded-lg ${c} shadow-md`} style={{ zIndex: k === 1 ? 2 : 1 }} />)}
      </div>
    </div>
  </div>
);

const PreparePreview = (
  <div className="w-full max-w-sm space-y-3 text-sm">
    <div className="loop-rise max-w-[85%] rounded-2xl rounded-bl-md bg-white p-3 text-forest-deep shadow-[0_12px_30px_-20px_rgb(7_33_26/0.6)]" style={v(0)}>Tell me about a time you negotiated a better price with a supplier.</div>
    <div className="loop-rise ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-forest p-3 text-white" style={v(2)}>Situation: our packaging costs rose 12%… Action: I benchmarked three vendors…</div>
    <div className="loop-rise max-w-[85%] rounded-2xl rounded-bl-md bg-white p-3 text-forest-deep shadow-[0_12px_30px_-20px_rgb(7_33_26/0.6)]" style={v(4)}>
      <p className="font-semibold text-leaf">Strong STAR answer</p>
      <p className="text-xs text-forest/70">Add the result as a number: what did it save?</p>
    </div>
    <div className="loop-pop flex gap-2 text-[11px] font-semibold" style={v(6)}>
      <span className="rounded-full bg-white px-2.5 py-1 text-forest">Skill test · SQL 7/10</span>
      <span className="rounded-full bg-white px-2.5 py-1 text-forest">Q 3 of 5</span>
    </div>
  </div>
);

const TrackPreview = (
  <div className="grid w-full max-w-sm grid-cols-3 gap-3 text-[11px]">
    {["Applied", "Interview", "Offer"].map((col) => (
      <div key={col} className="min-h-44 rounded-2xl bg-white/60 p-2">
        <p className="mb-2 px-1 font-semibold text-forest-deep">{col}</p>
        {col === "Applied" && (
          <>
            <div className="loop-move loop-glow relative z-10 rounded-xl bg-white p-2 text-forest-deep shadow-md"><p className="font-semibold">Sourcing Lead</p><p className="text-forest/60">Follow up Fri</p></div>
            <div className="mt-2 rounded-xl bg-white p-2 text-forest-deep shadow-sm"><p className="font-semibold">Buyer II</p><p className="text-forest/60">Applied 3d ago</p></div>
          </>
        )}
        {col === "Interview" && <div className="mt-[3.6rem] rounded-xl bg-white p-2 text-forest-deep shadow-sm"><p className="font-semibold">Category Mgr</p><p className="text-forest/60">Round 2</p></div>}
        {col === "Offer" && <div className="rounded-xl bg-mintwash p-2 text-forest-deep"><p className="font-semibold">Analyst</p><p className="text-forest/70">₹14 LPA</p></div>}
      </div>
    ))}
  </div>
);

const GROUPS: Group[] = [
  {
    id: "find", name: "Find jobs", title: "Live jobs, ranked for you", tone: "bg-mintwash", preview: FindPreview,
    intro: "Jobs from employer career sites and job APIs across India and remote roles, each read in full and scored against your résumé.",
    features: [
      { icon: Gauge, title: "Match score with reasons", body: "Out of 100, with every point explained: skills, role, seniority, location, pay and recency." },
      { icon: ListChecks, title: "Skills check", body: "Each skill the posting asks for, green if your résumé shows it, red if it doesn't." },
      { icon: FileText, title: "Complete job descriptions", body: "The whole posting, loaded from the employer's site before anything is scored." },
      { icon: Search, title: "Smart search and filters", body: "Country, city, remote, date posted and experience level; related titles included." },
      { icon: Link2, title: "Employer apply links", body: "The original posting on the company's site, plus where else it's advertised." },
      { icon: IndianRupee, title: "Salary insights", body: "Market pay in ₹ for the role and city, with the public sources it came from." },
      { icon: Bell, title: "Saved searches and alerts", body: "New matches by email, daily or weekly. Pro adds a 7 AM digest of your best matches." },
      { icon: Bookmark, title: "Add any job link", body: "Paste a link or description, or save a job from any site with the bookmarklet." },
    ],
  },
  {
    id: "apply", name: "Apply", title: "A résumé aimed at each job", tone: "bg-peri", preview: ApplyPreview,
    intro: "Upload once, then tailor for every role, with every change explained and nothing invented.",
    features: [
      { icon: Upload, title: "Résumé upload", body: "PDF, Word, pasted text or a LinkedIn \"Save to PDF\" export becomes an editable profile." },
      { icon: PenLine, title: "Résumé and cover-letter studio", body: "Keyword gap with evidence from your résumé, and rewrites you accept or reject line by line." },
      { icon: ShieldCheck, title: "Truthfulness guard", body: "Suggestions that add figures or skills you haven't confirmed are dropped." },
      { icon: Sparkles, title: "ATS alignment, before and after", body: "See how well your résumé lines up with the posting, and how much each edit helps." },
      { icon: Files, title: "52 templates for 40+ markets", body: "ATS-first and visual designs, with each country's date formats and conventions." },
      { icon: FileDown, title: "PDF and Word export", body: "Selectable-text PDF, editable Word, a plain ATS version, or the full application pack." },
      { icon: Mail, title: "Cover letters", body: "Matched to the job in three tones and lengths, ready to edit and export." },
      { icon: Files, title: "Résumé versions", body: "Keep a version per role, like \"Frontend focus\", and use it for matching." },
    ],
  },
  {
    id: "prepare", name: "Prepare", title: "Walk in having practised", tone: "bg-apricot/70", preview: PreparePreview,
    intro: "Practise for the exact role you applied to, and find out where you'd lose marks before the interviewer does.",
    features: [
      { icon: Mic, title: "Mock interviews", body: "Five questions for the job, feedback on each answer, and a summary at the end." },
      { icon: MessagesSquare, title: "Interview question bank", body: "Real questions by role, company and round, with STAR-style sample answers." },
      { icon: BookOpenCheck, title: "Skill assessments", body: "Test yourself on any skill, timed or untimed, and see exactly which topics to revise." },
      { icon: ClipboardCheck, title: "Talking points", body: "What to say about your fit, and how to address the skills you're missing." },
    ],
  },
  {
    id: "track", name: "Track", title: "Every application in one place", tone: "bg-mintsoft", preview: TrackPreview,
    intro: "Keep your search organised, follow up on time, and share a profile employers can read.",
    features: [
      { icon: KanbanSquare, title: "Applications board", body: "Drag jobs between stages, with notes, contacts and which résumé you sent." },
      { icon: Bell, title: "Follow-up reminders", body: "Set a follow-up date and get reminded; overdue ones are flagged." },
      { icon: BriefcaseBusiness, title: "Dashboard", body: "Résumé health, ATS and completeness scores, your next actions and this month's usage." },
      { icon: UserRound, title: "Public profile page", body: "A shareable page with three themes, a PDF download and per-section privacy." },
      { icon: Globe2, title: "Your data, your control", body: "Download everything you've stored, or delete your account and data at any time." },
    ],
  },
];

/** Every function of the site, grouped, each group with a looping animated preview. */
export function HomeFeatures() {
  return (
    <section id="features" className="scroll-mt-20 bg-white">
      <div className="shell py-20 lg:py-28">
        <div className="reveal max-w-3xl">
          <h2 className="serif-display text-[clamp(2.4rem,4.4vw,4rem)] leading-tight">Everything in CareerMatch</h2>
          <p className="mt-4 text-lg leading-8 text-forest/75">From the first search to the offer: finding jobs, applying, preparing and keeping track, all in one place.</p>
        </div>
        <nav aria-label="Feature groups" className="reveal mt-8 flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <a key={g.id} href={`#f-${g.id}`} className="rounded-full border border-forest-deep/20 px-4 py-2 text-sm font-semibold text-forest-deep transition-colors hover:border-forest-deep hover:bg-forest-deep hover:text-white">{g.name}</a>
          ))}
        </nav>
        <div className="mt-14 space-y-20 lg:space-y-28">
          {GROUPS.map((g, gi) => (
            <div key={g.id} id={`f-${g.id}`} className="scroll-mt-24 grid items-start gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
              <div className={`reveal group grid min-h-80 lg:sticky lg:top-24 place-items-center overflow-hidden rounded-3xl p-8 ${g.tone} ${gi % 2 ? "lg:order-last" : ""}`}>
                {g.preview}
              </div>
              <div>
                <p className="reveal text-sm font-semibold text-leaf">{g.name}</p>
                <h3 className="reveal mt-2 serif-display text-[clamp(2rem,3.2vw,3rem)] leading-tight">{g.title}</h3>
                <p className="reveal mt-3 max-w-xl text-lg leading-8 text-forest/75">{g.intro}</p>
                <ul className="reveal-stagger mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  {g.features.map((f) => (
                    <li key={f.title} className="group flex gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mintwash text-forest transition-[transform,background-color,color] duration-300 group-hover:-rotate-6 group-hover:bg-forest group-hover:text-white">
                        <f.icon className="size-5" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold text-forest-deep">{f.title}</p>
                        <p className="mt-1 text-[0.95rem] leading-6 text-forest/70">{f.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="reveal mt-20 flex flex-wrap items-center gap-4">
          <Link href="/signup" className="btn rounded-full bg-leaf px-6 py-3 text-base text-white hover:bg-forest">Start free with your résumé</Link>
          <Link href="/pricing" className="text-base font-semibold text-forest-deep underline decoration-forest/30 underline-offset-[6px] hover:decoration-forest">See what&rsquo;s in Pro</Link>
        </div>
      </div>
    </section>
  );
}
