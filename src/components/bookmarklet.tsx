"use client";

import { useEffect, useRef } from "react";

/**
 * React refuses to render javascript: URLs, so the href is set directly on
 * the DOM node. The script only opens our import page with the current URL.
 */
export function Bookmarklet({ appUrl }: { appUrl: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const code = `javascript:(()=>{window.open(${JSON.stringify(`${appUrl}/import?url=`)}+encodeURIComponent(location.href),'_blank','noopener')})()`;
  useEffect(() => {
    ref.current?.setAttribute("href", code);
  }, [code]);
  return (
    <div className="flex flex-col items-start gap-3">
      <a ref={ref} onClick={(e) => e.preventDefault()} draggable className="btn-primary cursor-grab px-5 py-3 text-base" title="Drag me to your bookmarks bar">
        ⭐ Save to CareerMatch
      </a>
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer">Can&apos;t drag? Copy the code instead</summary>
        <p className="mt-2">Create a new bookmark and paste this as its URL:</p>
        <code className="mt-1 block rounded bg-slate-100 p-2 break-all">{code}</code>
      </details>
    </div>
  );
}
