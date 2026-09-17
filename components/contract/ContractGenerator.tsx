"use client";

import { useEffect, useState } from "react";
import type { Skin } from "./types";
import Toolbar from "./Toolbar";
import FormPanel from "./FormPanel";
import ClauseRail from "./ClauseRail";
import DocPaper from "./DocPaper";
import { useContractDraft } from "./useContractDraft";
import { downloadMarkdown, downloadWord, printContract } from "./exporters";
import "./contract.css";

export default function ContractGenerator() {
  const { draft, setField, setToggle, setDeliverables, reset, pct } = useContractDraft();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [skin, setSkin] = useState<Skin>("studio");

  /* first paint follows the OS, then the toggle owns it. Deliberately not
     persisted: leaving the route is the way back from any choice here. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setTheme(mq.matches ? "dark" : "light");
  }, []);

  return (
    <div className="cgShell" data-cg-theme={theme} data-cg-skin={skin}>
      <Toolbar
        pct={pct}
        theme={theme}
        onTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        skin={skin}
        onSkin={setSkin}
        onPrint={printContract}
        onWord={() => downloadWord(draft)}
        onMarkdown={() => downloadMarkdown(draft)}
      />
      <div className="cgGrid">
        <div className="cgCol cgCol--form">
          <FormPanel
            draft={draft}
            setField={setField}
            setToggle={setToggle}
            setDeliverables={setDeliverables}
            reset={reset}
          />
        </div>
        <div className="cgCol cgCol--rail"><ClauseRail draft={draft} /></div>
        <div className="cgCol cgCol--paper"><DocPaper draft={draft} /></div>
      </div>
    </div>
  );
}
