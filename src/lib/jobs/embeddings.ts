import "server-only";
// Optional semantic matching with Voyage AI embeddings (Anthropic's
// recommended embeddings provider). Enabled when VOYAGE_API_KEY is set;
// otherwise ranking uses the built-in lexical similarity in rank.ts.

const MODEL = process.env.VOYAGE_MODEL || "voyage-3.5-lite";

export const embeddingsEnabled = () => Boolean(process.env.VOYAGE_API_KEY);

export async function embedTexts(texts: string[], inputType: "query" | "document"): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts.map((t) => t.slice(0, 8000)), model: MODEL, input_type: inputType }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Voyage HTTP ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export const jobEmbeddingText = (j: { title: string; description: string }) => `${j.title}\n${j.description.slice(0, 4000)}`;

export function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
