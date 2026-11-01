# Resume & Cover Letter Studio — implementation plan

Source: `Claude_Code_Resume_Builder_Handoff/CLAUDE_CODE_HANDOFF.md` plus the owner's additions
(country templates with previews, Free/Pro template tiers, Canva-style editor, tailoring from the
job page, a playful features showcase on the homepage).

## What exists today (and what is wrong with it)

| Area | Today | Reuse / change |
|---|---|---|
| Framework | Next.js 15 App Router, React 19, Tailwind v4, Prisma 6 (SQLite local, Neon Postgres prod), Vercel Hobby (60 s requests) | Reuse as is |
| Auth / plans | `requireUser`, `apiUser`, `planOf`, `consumeAiAction`, `claimExport` (Free: 5 AI actions/month, 1 résumé export, 1 cover-letter export) | Reuse; add template tiers |
| AI | `lib/ai.ts`: Gemini (free tier, per-model daily quota) or Claude; `generateStructured` with zod; `TRUTHFULNESS_RULES` | Reuse; new prompts versioned |
| Résumé upload | `/api/resume` → `extractResumeText` (PDF via unpdf, DOCX via mammoth) → `parseResume` (AI or heuristic) → review in onboarding → `Profile` (encrypted) | Reuse; add immutable original + OCR fallback |
| Base versions | `ResumeVersion` (Free 1, Pro 20) | Reuse as base résumés |
| Tailoring | `lib/generate.ts` kind `ats_resume`: one AI call returns a whole résumé; when AI is unavailable a "template" fallback **only re-orders the original bullets, word for word** | Replace with the new engine |
| Export | `lib/export/documents.ts`: 3 single-column styles, PDF (pdf-lib) + DOCX (docx) | Generalise into a template renderer |
| Job page | `jobs/[id]/page.tsx` with `GeneratorPanel` in the sidebar | Add "Tailor Résumé & Cover Letter" overlay |

**Why the current ATS résumé repeated your bullets:** two of your last three attempts ran the
fallback path (Gemini's free daily quota was used up), and that path never rewrites text. The
third used Gemini, but the prompt only asked it to "mirror terminology where truthful" with no
per-bullet rewrite, reasons or review step.

## Decisions that differ from the request

1. **Templates are original, not downloaded.** Canva, Microsoft, Zety, Novorésumé etc. templates
   are copyrighted; copying them would expose the site to takedowns. The handoff spec (rule 7)
   also forbids it. Instead: original templates built from each country's documented conventions
   (Europass, German Lebenslauf, Japanese Rirekisho, Indian corporate…), each with a live preview.
2. **Canva-style, not Canva-copied.** Same interaction pattern (left tool rail, central canvas,
   right context panel, template gallery with badges), in CareerMatch's own brand.
3. **No fabrication, ever.** Keywords you don't have are never silently added; they are offered as
   "Not evidenced — add only if true / add to Learning / leave out".

## Architecture

```
src/lib/tailor/
  requirements.ts   JD → requirements (AI with deterministic fallback), grouped & weighted
  evidence.ts       requirement ↔ résumé matching: exact / equivalent / partial / missing / unclear
  score.ts          Estimated ATS Alignment, method "ats-align-v1" (40/15/20/15/10 weights)
  rewrite.ts        per-bullet proposals {original, proposed, reason, keywords} + guard
  guard.ts          rejects new numbers, employers, dates, unselected skills in proposals
  cover-letter.ts   evidence-backed letter, tone + length options
  checklist.ts      pre-export validation (contact, dates, duplicates, unsupported keywords…)
src/lib/templates/
  catalog.ts        ~50 templates, 40+ markets: country, mode (ATS-first / Visual), tier (Free/Pro),
                    paper (A4/Letter), date format, photo & personal-data fields, section order
  layout.ts         one layout model → HTML preview, PDF (pdf-lib) and DOCX (docx), so the preview
                    matches the download
prisma: ResumeUpload (immutable original files), TailorDraft (job/JD, selections, proposals,
        accepted text, letter, scores + method version, revision history)
UI:  /studio (new "Make Résumé & Cover Letter" tab) — Canva-style workspace
     job page "Tailor Résumé & Cover Letter" → same workspace as a wide overlay with
     "Back to job description" (keeps scroll position, no new tab)
```

## Phases (each tested before the next)

1. **Data + master résumé** — `ResumeUpload` (original file kept, encrypted, never overwritten),
   `TailorDraft`; OCR fallback for scanned PDFs through Gemini; low-confidence flags.
2. **Job analysis + keyword gap** — requirements extraction, evidence matching with synonyms and
   acronyms (Procure-to-Pay ↔ P2P), five statuses, five groups, per-keyword suggestion cards.
3. **Scoring** — transparent weights, before/after, per-category deltas, method version stored.
4. **Tailoring engine** — per-bullet rewrites with reasons; guard rejects unsupported facts;
   accept / reject / edit each change; revision history; "What to change" action plan.
   Works without AI too (deterministic keyword-in-context suggestions), but never pretends.
5. **Cover letter** — same job context, tone (formal / confident / concise) and length options.
6. **Templates + exports** — catalog, live previews, ATS-first plain DOCX always available,
   PDF with selectable text, combined application pack, `First_Last_Title_Company_CV.docx` names,
   pre-export checklist.
7. **Studio UI + job overlay** — Canva-style workspace, zoom, undo/redo, section reorder,
   autosave, drafts / duplicate / versions, mobile layout, keyboard + screen-reader support.
8. **Plans** — Free: one tailored résumé + one cover letter (one job), Free templates only;
   Pro: every template and unlimited drafts. Badges on every template card and on the documents.
9. **Homepage features showcase** — playful, interactive section presenting every feature.
10. **Regression + release** — full test suite, job feed/scraper/search checks, deploy, live checks.

## Acceptance tests (from the handoff, §10)

Each phase adds automated tests for its part; the final phase runs the full list against the
live site, including that job scraping, listings, accounts and exports still work.
