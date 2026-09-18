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
import { useDocStyle } from "./useDocStyle";
import { useDocLogo } from "./useDocLogo";
import { processLogoFile } from "./logo";
import { downloadMarkdown, downloadWord, printContract } from "./exporters";
import "./contract.css";

export default function ContractGenerator() {
  const { draft, setField, setToggle, setDeliverables, reset, pct } = useContractDraft();
  /* document styling and the logo: both kept off Draft's own key, both
     off each other's - see useDocStyle.ts and useDocLogo.ts for why */
  const { style, setStyleField } = useDocStyle();
  const { logo, setLogo, error: logoError, clearError: clearLogoError } = useDocLogo();
  /* surfaces logo.ts's own validation (wrong type, source file too big)
     alongside useDocLogo's storage-quota error, in one place: whichever
     fired most recently is what the LOGO block shows */
  const [logoPickError, setLogoPickError] = useState<string | null>(null);
  const logoMessage = logoPickError ?? logoError;

  const handleLogoFile = async (file: File) => {
    setLogoPickError(null);
    clearLogoError();
    const result = await processLogoFile(file);
    if (!result.ok) {
      setLogoPickError(result.error);
      return;
    }
    setLogo(result.dataUrl);
  };

  const handleRemoveLogo = () => {
    setLogoPickError(null);
    clearLogoError();
    setLogo(null);
  };
  /* first paint is always light, then the toggle owns it. Deliberately not
     persisted: leaving the route is the way back from any choice here. */
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [skin, setSkin] = useState<Skin>("studio");
  const [tab, setTab] = useState<"form" | "preview">("form");
  /* the side panel overlay, only meaningful below 1536px (see SidePanel
     and .cgSide in contract.css); harmless to leave set at wider widths
     since CSS docks the panel and ignores this attribute there */
  const [sideOpen, setSideOpen] = useState(false);
  /* the two docked-panel collapse rails (see .cgPanelRail in contract.css).
     React state only, not persisted, same rule the route's theme already
     follows: nothing here should be able to strand a visitor on a look
     they have no way back from, and a collapsed panel resets on leave.
     formCollapsed only has a visual effect at >=1100px and sideCollapsed
     only at >=1536px (see the matching @media blocks in contract.css);
     below those widths the buttons that flip these still render but the
     grid ignores the state, matching how sideOpen is already harmless at
     wide viewports. */
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  /* Readiness (in the panel) asks the form to open a group and focus a
     field; FormPanel owns the accordion's open state, so this is passed
     down as a request rather than lifting that state up here */
  const [focusRequest, setFocusRequest] = useState<{ group: string; field: keyof Draft } | null>(null);

  const handleJumpToField = (field: keyof Draft) => {
    const group = groupIdForField(field);
    if (!group) return;
    setSideOpen(false);
    /* the field this jumps to lives inside the accordion, which is not
       rendered while the form panel is collapsed to its rail; expand it
       first or the focus below would target a node that does not exist */
    setFormCollapsed(false);
    setFocusRequest({ group, field });
  };

  return (
    <div
      className="cgShell"
      data-cg-theme={theme}
      data-cg-skin={skin}
      data-cg-tab={tab}
      data-cg-side={sideOpen ? "open" : "closed"}
      data-cg-panel-form={formCollapsed ? "collapsed" : "expanded"}
      data-cg-panel-side={sideCollapsed ? "collapsed" : "expanded"}
    >
      <Toolbar
        pct={pct}
        theme={theme}
        onTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        sideOpen={sideOpen}
        onToggleSide={() => setSideOpen((o) => !o)}
        onReset={reset}
        onPrint={printContract}
        onWord={() => downloadWord(draft, logo)}
        onMarkdown={() => downloadMarkdown(draft, Boolean(logo))}
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
            {t === "form" ? "Agreement Details" : "Preview"}
          </button>
        ))}
      </div>
      <div className="cgGrid">
        <div className="cgCol cgCol--form">
          <FormPanel
            draft={draft}
            setField={setField}
            setDeliverables={setDeliverables}
            focusRequest={focusRequest}
            onFocusHandled={() => setFocusRequest(null)}
            collapsed={formCollapsed}
            onToggleCollapse={() => setFormCollapsed((c) => !c)}
          />
        </div>
        <div className="cgCol cgCol--rail"><ClauseRail draft={draft} /></div>
        <div className="cgCol cgCol--paper"><DocPaper draft={draft} style={style} logo={logo} /></div>
        <SidePanel
          draft={draft}
          setToggle={setToggle}
          skin={skin}
          onSkin={setSkin}
          theme={theme}
          style={style}
          setStyleField={setStyleField}
          logo={logo}
          logoMessage={logoMessage}
          onLogoFile={handleLogoFile}
          onRemoveLogo={handleRemoveLogo}
          onPrint={printContract}
          onWord={() => downloadWord(draft, logo)}
          onMarkdown={() => downloadMarkdown(draft, Boolean(logo))}
          onJumpToField={handleJumpToField}
          open={sideOpen}
          onClose={() => setSideOpen(false)}
          collapsed={sideCollapsed}
          onToggleCollapse={() => setSideCollapsed((c) => !c)}
        />
      </div>
    </div>
  );
}
