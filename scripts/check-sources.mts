// Live check of the employer-board sources with their default boards:
//   npx tsx scripts/check-sources.ts [sourceId ...]
// Prints listings per source, how many came with a complete description, and
// any board that failed or returned nothing. Touches no database.

import { oracle, smartrecruiters, successfactors, workable, workday } from "../src/lib/jobs/sources/ats-boards";
import { ashby, greenhouse, lever, type BoardJobs } from "../src/lib/jobs/sources/employer-boards";
import type { SourceDefinition } from "../src/lib/jobs/types";

const all: SourceDefinition[] = [greenhouse, lever, ashby, workday, smartrecruiters, workable, successfactors, oracle];
const pick = process.argv.slice(2);

for (const src of all.filter((s) => !pick.length || pick.includes(s.id))) {
  const started = Date.now();
  try {
    const jobs: BoardJobs = await src.fetchJobs({ keywords: [] }, AbortSignal.timeout(90_000), { boards: src.defaultBoards ?? [] });
    const full = jobs.filter((j) => !j.summaryOnly).length;
    console.log(`${src.id.padEnd(16)} ${String(jobs.length).padStart(5)} jobs  ${String(full).padStart(5)} full  ${((Date.now() - started) / 1000).toFixed(1)}s${jobs.warnings ? `  ⚠ ${jobs.warnings.join("; ")}` : ""}`);
    const sample = jobs[0];
    if (sample) console.log(`${"".padEnd(16)} e.g. ${sample.title} · ${sample.company} · ${sample.location} · ${sample.description.length} chars`);
  } catch (e) {
    console.log(`${src.id.padEnd(16)} FAILED ${(e as Error).message}`);
  }
}
