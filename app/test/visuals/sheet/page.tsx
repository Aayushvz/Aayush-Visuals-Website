import type { Metadata } from "next";
import Wordmark, { Glyph } from "@/components/test/visuals/Wordmark";
import { CENTRELINES } from "@/components/test/visuals/glyphs";

export const metadata: Metadata = {
  title: "Specimen",
  robots: { index: false, follow: false },
};

/* Type specimen for the nib face - a working sheet, not a public page. */
export default function Sheet() {
  return (
    <main style={{ background: "#ece3ff", color: "#5a17f5", minHeight: "100vh", padding: 40 }}>
      <div style={{ width: 900 }}><Wordmark write={false} className="" /></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginTop: 40, alignItems: "flex-end" }}>
        {Object.keys(CENTRELINES).map((k) => (
          <div key={k} style={{ outline: "1px solid #5a17f522", height: 200 }}>
            <Glyph k={k} className="" />
          </div>
        ))}
      </div>
      <style>{`main svg{display:block;width:100%;height:auto} main div[style*="height"] svg{height:200px;width:auto}`}</style>
    </main>
  );
}
