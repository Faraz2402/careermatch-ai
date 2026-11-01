import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { STYLES, styleTags, TEMPLATES, templateById } from "@/lib/templates/catalog";
import { buildDoc, SAMPLE_PERSONAL, SAMPLE_RESUME } from "@/lib/templates/model";
import { renderResumeDocx, renderResumePdf } from "@/lib/templates/render";

const photoUrl = async () => `data:image/jpeg;base64,${(await sharp({ create: { width: 64, height: 64, channels: 3, background: "#4263ff" } }).jpeg().toBuffer()).toString("base64")}`;

describe("template styles", () => {
  it("tags every template and fills every style with free and Pro designs", () => {
    for (const t of TEMPLATES) expect(styleTags(t).length).toBeGreaterThan(0);
    for (const style of STYLES) {
      const inStyle = TEMPLATES.filter((t) => styleTags(t).includes(style));
      expect(inStyle.length, style).toBeGreaterThanOrEqual(4);
      expect(inStyle.some((t) => t.tier === "free"), `${style} has a free template`).toBe(true);
      expect(inStyle.some((t) => t.tier === "pro"), `${style} has a Pro template`).toBe(true);
    }
  });

  it("treats photo headers as visual and only carries a photo for them", async () => {
    const photo = await photoUrl();
    const portrait = templateById("style-portrait-header");
    expect(portrait.mode).toBe("visual");
    expect(buildDoc(SAMPLE_RESUME, portrait, {}, { photo }).photo).toBe(photo);
    expect(buildDoc(SAMPLE_RESUME, templateById("intl-ats"), {}, { photo }).photo).toBeUndefined();
    expect(buildDoc(SAMPLE_RESUME, portrait, {}, { photo: "data:image/png;base64,AAAA" }).photo).toBeUndefined();
  });

  it("puts education first in first-job designs", () => {
    const keys = buildDoc(SAMPLE_RESUME, templateById("style-first-job")).sections.map((s) => s.key);
    expect(keys.indexOf("education")).toBeLessThan(keys.indexOf("experience"));
  });

  for (const id of TEMPLATES.filter((t) => t.style.header === "photo").map((t) => t.id))
    it(`${id} exports with and without a photo`, async () => {
      const t = templateById(id);
      const photo = await photoUrl();
      for (const p of [photo, undefined]) {
        const pdf = await renderResumePdf(buildDoc(SAMPLE_RESUME, t, SAMPLE_PERSONAL, { pdf: true, photo: p }));
        const loaded = await PDFDocument.load(pdf);
        expect(loaded.getPageCount()).toBeGreaterThan(0);
        if (p) expect(Buffer.from(pdf).toString("latin1")).toContain("/DCTDecode");
        const docx = await renderResumeDocx(buildDoc(SAMPLE_RESUME, t, SAMPLE_PERSONAL, { photo: p }));
        expect(docx.length).toBeGreaterThan(1000);
      }
    });
});
