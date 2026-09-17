"use client";

import { useState } from "react";
import type { Draft, Skin } from "./types";
import { groupIdForField } from "./schema";
import Toolbar from "./Toolbar";
import FormPanel from "./FormPanel";
import ClauseRail from "./ClauseRail";
import DocPaper from "./DocPaper";
import SidePanel from "./SidePanel";
import { useContractDraft } from "./useContractDraft";
import { downloadMarkdown, downloadWord, printContract } from "./exporters";
import "./contract.css";

export default function ContractGenerator() {
  const { draft, setField, setToggle, setDeliverables, reset, pct } = useContractDraft();
  /* first paint is always light, then the toggle owns it. Deliberately not
     persisted: leaving the route is the way back from any choice here. */
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [skin, setSkin] = useState<Skin>("studio");
  const [tab, setTab] = useState<"form" | "preview">("form");
  /* the side panel overlay, only meaningful below 1280px (see SidePanel
     and .cgSide in contract.css); harmless to leave set at wider widths
     since CSS docks the panel and ignores this attribute there */
  const [sideOpen, setSideOpen] = useState(false);
  /* Readiness (in the panel) asks the form to open a group and focus a
     field; FormPanel owns the accordion's open state, so this is passed
     down as a request rather than lifting that state up here */
  const [focusRequest, setFocusRequest] = useState<{ group: string; field: keyof Draft } | null>(null);

  const handleJumpToField = (field: keyof Draft) => {
    const group = groupIdForField(field);
    if (!group) return;
    setSideOpen(false);
    setFocusRequest({ group, field });
  };

  return (
    <div
      className="cgShell"
      data-cg-theme={theme}
      data-cg-skin={skin}
      data-cg-tab={tab}
      data-cg-side={sideOpen ? "open" : "closed"}
    >
      <Toolbar
        pct={pct}
        theme={theme}
        onTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        sideOpen={sideOpen}
        onToggleSide={() => setSideOpen((o) => !o)}
        onPrint={printContract}
        onWord={() => downloadWord(draft)}
        onMarkdown={() => downloadMarkdown(draft)}
      />
      <div className="cgTabs" role="tablist" aria-label="Panel">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className="cgSeg__btn"
            aria-selected={tab === t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "form" ? "Contract Data" : "Preview"}
          </button>
        ))}
      </div>
      <div className="cgGrid">
        <div className="cgCol cgCol--form">
          <FormPanel
            draft={draft}
            setField={setField}
            setDeliverables={setDeliverables}
            reset={reset}
            focusRequest={focusRequest}
            onFocusHandled={() => setFocusRequest(null)}
          />
        </div>
        <div className="cgCol cgCol--rail"><ClauseRail draft={draft} /></div>
        <div className="cgCol cgCol--paper"><DocPaper draft={draft} /></div>
        <SidePanel
          draft={draft}
          setToggle={setToggle}
          skin={skin}
          onSkin={setSkin}
          onPrint={printContract}
          onWord={() => downloadWord(draft)}
          onMarkdown={() => downloadMarkdown(draft)}
          onJumpToField={handleJumpToField}
          open={sideOpen}
          onClose={() => setSideOpen(false)}
        />
      </div>
    </div>
  );
}
