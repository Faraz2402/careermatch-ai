// Word-level diff (LCS) used to show what the tailored resume changed.

export type DiffPart = { type: "same" | "add" | "del"; text: string };

export function wordDiff(a: string, b: string): DiffPart[] {
  const A = a.split(/(\s+)/).filter(Boolean);
  const B = b.split(/(\s+)/).filter(Boolean);
  if (A.length * B.length > 250_000) return [{ type: "del", text: a }, { type: "add", text: b }];
  const dp = Array.from({ length: A.length + 1 }, () => new Uint16Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffPart[] = [];
  const push = (type: DiffPart["type"], text: string) => {
    const last = out[out.length - 1];
    if (last?.type === type) last.text += text;
    else out.push({ type, text });
  };
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      push("same", A[i]);
      i++;
      j++;
    }
    else if (dp[i + 1][j] >= dp[i][j + 1]) push("del", A[i++]);
    else push("add", B[j++]);
  }
  while (i < A.length) push("del", A[i++]);
  while (j < B.length) push("add", B[j++]);
  return out;
}

const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** Closest original bullet for a rewritten one (null if nothing similar). */
export function closestOriginal(bullet: string, originals: string[]): string | null {
  const t = tokens(bullet);
  let best: string | null = null, bestScore = 0;
  for (const o of originals) {
    const u = tokens(o);
    let inter = 0;
    for (const w of t) if (u.has(w)) inter++;
    const s = inter / (t.size + u.size - inter || 1);
    if (s > bestScore) [best, bestScore] = [o, s];
  }
  return bestScore >= 0.3 ? best : null;
}
