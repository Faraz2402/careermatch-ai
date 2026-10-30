// End-to-end flow against a running server:
//   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
// Sign up → paste resume → save profile → preferences → add a job → search →
// generate + review + export → track → saved search → export data → delete.

import { describe, expect, it } from "vitest";

const BASE = process.env.E2E_BASE_URL;

describe.skipIf(!BASE)("end-to-end user flow", () => {
  let cookie = "";
  const call = async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      redirect: "manual",
      headers: { ...(init.json !== undefined && { "Content-Type": "application/json" }), ...(cookie && { Cookie: cookie }) },
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    const set = res.headers.get("set-cookie");
    if (set?.includes("cm_session=")) cookie = set.split(";")[0];
    return res;
  };
  const json = async (path: string, init: RequestInit & { json?: unknown } = {}) => {
    const res = await call(path, init);
    const body = await res.json();
    if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(body)}`);
    return body;
  };

  const email = `e2e-${Date.now()}@example.com`;
  let jobId = "";
  let genId = "";

  it("signs up and is protected afterwards", async () => {
    expect((await call("/dashboard")).status).toBe(307); // not signed in yet
    await json("/api/auth/signup", { method: "POST", json: { name: "E2E Tester", email, password: "e2e-pass-123" } });
    expect(cookie).toContain("cm_session=");
    expect((await call("/dashboard")).status).toBe(200);
  });

  it("parses a pasted resume and saves the profile", async () => {
    const text = "Alex Kim\nFrontend Engineer\nSeattle, WA | alex@example.com | 206-555-0100\n\nExperience\nFrontend Engineer | Acme\nJan 2020 - Present\n• Built React and TypeScript dashboards used by 40 teams, cutting load time 30%.\n• Wrote GraphQL APIs in Node.js.\n\nEducation\nUniversity of Washington\nB.S. Computer Science, 2019\n\nSkills\nReact, TypeScript, Node.js, GraphQL, CSS, Jest, AWS, Docker";
    const parsed = await json("/api/resume", { method: "POST", json: { text } });
    expect(parsed.data.name).toBe("Alex Kim");
    await json("/api/profile", { method: "PUT", json: { data: parsed.data, resumeText: parsed.text, parsedBy: parsed.parsedBy } });
    await json("/api/preferences", {
      method: "PUT",
      json: { roles: ["Frontend Engineer"], seniority: "mid", locations: [], workModes: ["remote", "hybrid", "onsite"], salaryMin: null, salaryMax: null, employmentTypes: ["full-time"], industries: [], workAuthorization: "", needsSponsorship: false },
    });
  });

  it("adds a job by pasted description and finds it in search", async () => {
    const r = await json("/api/jobs/import", {
      method: "POST",
      json: { title: "Senior Frontend Engineer", company: "E2E Corp", location: "Remote", description: "We need React, TypeScript, GraphQL and Playwright experience to build our design system. 5+ years." },
    });
    jobId = r.id;
    const s = await json("/api/jobs/search?sources=user_link");
    const found = s.jobs.find((j: { id: string }) => j.id === jobId);
    expect(found).toBeTruthy();
    expect(found.match.matched).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(found.match.missing).toContain("Playwright");
  });

  it("generates an ATS resume, saves a review, and exports PDF + DOCX", async () => {
    const g = await json("/api/generate", { method: "POST", json: { jobId, kind: "ats_resume" } });
    genId = g.id;
    expect(g.content.experience[0].company).toBe("Acme"); // never invents employers
    const reviewed = { ...g.content, summary: "Reviewed summary." };
    await json(`/api/generations/${genId}`, { method: "PUT", json: { finalContent: reviewed } });
    const pdf = await call(`/api/generations/${genId}/export?format=pdf&template=modern`);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    const docx = await call(`/api/generations/${genId}/export?format=docx`);
    expect(new Uint8Array(await docx.arrayBuffer())[0]).toBe(0x50);
  });

  it("streams a cover letter", async () => {
    const res = await call("/api/generate/stream", { method: "POST", json: { jobId } });
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.at(-1).type).toBe("done");
    expect(lines.at(-1).content.body).toContain("E2E Corp");
  });

  it("tracks the application and saves a search", async () => {
    const st = await json(`/api/jobs/${encodeURIComponent(jobId)}/state`, { method: "POST", json: { status: "applied", contactName: "Pat" } });
    expect(st.state.appliedAt).toBeTruthy();
    await json("/api/saved-searches", { method: "POST", json: { name: "Frontend remote", frequency: "weekly", filters: { q: "frontend", workMode: ["remote"] } } });
    const list = await json("/api/saved-searches");
    expect(list.searches).toHaveLength(1);
  });

  it("exports data and deletes the account", async () => {
    const exp = await json("/api/account/export");
    expect(exp.account.email).toBe(email);
    expect(exp.profile.data.name).toBe("Alex Kim");
    expect(exp.generatedDocuments.length).toBeGreaterThan(0);
    await json("/api/account", { method: "DELETE", json: { password: "e2e-pass-123", confirm: "DELETE" } });
    const login = await call("/api/auth/login", { method: "POST", json: { email, password: "e2e-pass-123" } });
    expect(login.status).toBe(401);
  });
});
