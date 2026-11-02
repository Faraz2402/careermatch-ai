"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Shows a full-size page scaled to its container's width. `crop` keeps the page's aspect ratio
 * (first page only, for cards); otherwise the whole document is shown at its scaled height.
 */
export function Scaled({ pageW, pageH, crop, initial = 0.3, children }: { pageW: number; pageH: number; crop?: boolean; initial?: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initial);
  const [h, setH] = useState(pageH * initial);
  useLayoutEffect(() => {
    const el = box.current;
    const doc = inner.current;
    if (!el || !doc) return;
    const update = () => {
      const s = el.clientWidth / pageW;
      setScale(s);
      setH((crop ? pageH : doc.scrollHeight) * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(doc);
    return () => ro.disconnect();
  }, [pageW, pageH, crop]);
  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ height: h }}>
      <div ref={inner} style={{ width: pageW, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );
}
