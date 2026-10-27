import type { Metadata } from "next";
import { DEMOS } from "@/components/playground/sphere/demos";

export const metadata: Metadata = { title: "Demos", robots: { index: false, follow: false } };

/* QA sheet: every playground demo loop at card size, side by side. */
export default function DemoSheet() {
  return (
    <main style={{ background: "#f4e5de", minHeight: "100vh", padding: 24, display: "flex", flexWrap: "wrap", gap: 20 }}>
      {Object.entries(DEMOS).map(([id, Demo]) => (
        <div key={id} style={{ position: "relative", width: 300, height: 225, borderRadius: 8, overflow: "hidden" }}>
          <Demo />
        </div>
      ))}
    </main>
  );
}
