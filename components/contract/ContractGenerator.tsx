"use client";

import { useState } from "react";
import type { Overrides, Skin } from "./types";
import Toolbar from "./Toolbar";
import FormPanel from "./FormPanel";
import ClauseRail from "./ClauseRail";
import DocPaper from "./DocPaper";
import SidePanel from "./SidePanel";
import EditBar from "./EditBar";
import { useContractDraft } from "./useContractDraft";
import { useDocStyle } from "./useDocStyle";
import { useDocLogo } from "./useDocLogo";
import { useOverrides, mergeOverrides, withOverride, withoutClause } from "./useOverrides";
import { processLogoFile } from "./logo";
import { downloadMarkdown, downloadWord, printContract } from "./exporters";
import "./contract.css";

export default function ContractGenerator() {
  const { draft, setField, setToggle, setDeliverables, reset, pct } = useContractDraft();
  /* document styling and the logo: both kept off Draft's own key, both
     off each other's - see useDocStyle.ts and useDocLogo.ts for why */
  const { style, setStyleField } = useDocStyle();
  const { logo, setLogo, error: logoError, clearError: clearLogoError } = useDocLogo();
  /* hand-edited clause prose, on its own key again for the same reason
     (see useOverrides.ts) */
  const { overrides, setOverride, clearClauseOverride, clearAllOverrides } = useOverrides();
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

  /* Edit mode (Task 2). `pendingEdits` is the current session's own
     unsaved deltas ONLY, never a copy of `overrides` - entering edit
     mode does not snapshot anything, it just starts this at {}. Cancel
     (and the toggle acting as Cancel) discards it outright; Save folds
     each entry into the persisted store via setOverride and then clears
     it. Because it holds nothing until something is actually typed and
     blurred, "leaving previously saved overrides intact" on Cancel is
     true by construction, not by restoring a snapshot. */
  const [editMode, setEditMode] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<Overrides>({});

  /* what DocPaper actually renders: outside edit mode this is exactly
     `overrides`, so leaving edit mode (or never entering it) shows only
     what was saved. While editing, a block the user has touched but not
     yet saved still has to appear where it is (and the "edited" mark
     still has to react live), which needs the two layered - see the
     `overrides` comment on DocPaper's own props. */
  const effectiveOverrides = editMode ? mergeOverrides(overrides, pendingEdits) : overrides;

  const handleEditBlock = (clauseId: string, key: number, text: string) => {
    setPendingEdits((p) => withOverride(p, clauseId, key, text));
  };

  const handleEnterEdit = () => setEditMode(true);

  const handleCancelEdit = () => {
    setPendingEdits({});
    setEditMode(false);
  };

  const handleSaveEdit = () => {
    for (const [clauseId, entries] of Object.entries(pendingEdits)) {
      for (const [key, text] of Object.entries(entries)) {
        setOverride(clauseId, Number(key), text);
      }
    }
    setPendingEdits({});
    setEditMode(false);
  };

  /* the per-clause Revert next to the "edited" mark (Task 3): reattaches
     one clause to the form without touching any other clause's override,
     and without reviving a not-yet-saved edit to the same clause once
     its persisted override is gone */
  const handleRevertClause = (clauseId: string) => {
    clearClauseOverride(clauseId);
    setPendingEdits((p) => withoutClause(p, clauseId));
  };

  /* "Revert to default" in the edit bar: the whole document, confirmed
     first (EditBar owns that confirmation), unconditional like the
     toolbar's own Reset */
  const handleRevertAll = () => {
    clearAllOverrides();
    setPendingEdits({});
  };

  /* Reset all (toolbar): clears the draft and every override together,
     unconditionally - see Toolbar's own aria-label for the wording */
  const handleResetAll = () => {
    reset();
    clearAllOverrides();
    setPendingEdits({});
    setEditMode(false);
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
        onReset={handleResetAll}
        onPrint={printContract}
        onWord={() => downloadWord(draft, overrides, logo)}
        onMarkdown={() => downloadMarkdown(draft, overrides, Boolean(logo))}
        editMode={editMode}
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
            collapsed={formCollapsed}
            onToggleCollapse={() => setFormCollapsed((c) => !c)}
          />
        </div>
        <div className="cgCol cgCol--rail"><ClauseRail draft={draft} /></div>
        <div className="cgCol cgCol--paper">
          <EditBar
            editMode={editMode}
            onEnter={handleEnterEdit}
            onCancel={handleCancelEdit}
            onSave={handleSaveEdit}
            onRevertAll={handleRevertAll}
          />
          <DocPaper
            draft={draft}
            style={style}
            logo={logo}
            overrides={effectiveOverrides}
            editMode={editMode}
            onEditBlock={handleEditBlock}
            onRevertClause={handleRevertClause}
          />
        </div>
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
          onWord={() => downloadWord(draft, overrides, logo)}
          onMarkdown={() => downloadMarkdown(draft, overrides, Boolean(logo))}
          open={sideOpen}
          onClose={() => setSideOpen(false)}
          collapsed={sideCollapsed}
          onToggleCollapse={() => setSideCollapsed((c) => !c)}
        />
      </div>
    </div>
  );
}
