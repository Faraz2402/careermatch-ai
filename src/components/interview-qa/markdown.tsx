"use client";

// Small Markdown renderer for interview answers: paragraphs, headings, lists,
// tables, inline code/bold/italics/links and fenced code blocks highlighted
// with Prism. Text is rendered as React elements (escaped); only Prism's own
// output - built from the escaped code - is injected as HTML.

import Prism from "prismjs";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-java";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

const LANG: Record<string, string> = { js: "javascript", javascript: "javascript", jsx: "jsx", "jsx harmony": "jsx", ts: "typescript", typescript: "typescript", tsx: "tsx", py: "python", python: "python", sql: "sql", java: "java", bash: "bash", sh: "bash", shell: "bash", json: "json", html: "markup", xml: "markup", css: "css", dax: "sql", excel: "sql", vba: "javascript", apex: "java" };

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const key = LANG[lang.toLowerCase()] ?? (/^(select|with|insert|update|create)\b/i.test(code.trim()) ? "sql" : "javascript");
  const grammar = Prism.languages[key];
  const html = grammar ? Prism.highlight(code, grammar, key) : code.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b1020]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#8b95ba] uppercase">
        <span>{lang || key}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[#b3bbd9] normal-case hover:bg-white/10"
          aria-label="Copy code"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="iq-code overflow-x-auto p-3.5 text-[13px] leading-relaxed text-[#e6e9f6]">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (m[1]) out.push(<code key={k} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[0.88em] text-brand-700">{t.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k} className="font-semibold text-slate-900">{t.slice(2, -2)}</strong>);
    else if (m[3]) {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)\s]+)\)/)!;
      const safe = /^(https?:|\/)/.test(href) ? href : "#";
      out.push(<a key={k} href={safe} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700">{label}</a>);
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^\s*```\s*([\w+ -]*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      nodes.push(<CodeBlock key={k++} code={body.join("\n")} lang={fence[1].trim()} />);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? "")) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|?\s*:?-{2,}/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      const [head, ...rest] = rows;
      nodes.push(
        <div key={k++} className="my-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700"><tr>{head.map((c, j) => <th key={j} className="px-3 py-2 font-semibold">{inline(c, j)}</th>)}</tr></thead>
            <tbody>{rest.map((r, ri) => <tr key={ri} className="border-t border-slate-200">{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{inline(c, j)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const h = line.match(/^\s*#{1,6}\s+(.+)/);
    if (h) {
      nodes.push(<p key={k++} className="mt-4 mb-1 font-display text-[15px] font-bold text-slate-900">{inline(h[1])}</p>);
      i++;
      continue;
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""));
      const List = ordered ? "ol" : "ul";
      nodes.push(<List key={k++} className={`my-2 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-brand-500`}>{items.map((it, j) => <li key={j}>{inline(it, j)}</li>)}</List>);
      continue;
    }
    if (!line.trim() || /^<\/?[a-z]/i.test(line.trim())) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i]) && !/^\s*#{1,6}\s/.test(lines[i]) && !/^\s*\|.*\|\s*$/.test(lines[i])) para.push(lines[i++].trim());
    nodes.push(<p key={k++} className="my-2 leading-relaxed">{inline(para.join(" "))}</p>);
  }
  return <div className="text-[15px] text-slate-700">{nodes}</div>;
}
