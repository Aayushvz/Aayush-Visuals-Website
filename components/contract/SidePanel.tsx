"use client";

import { useEffect, useRef, useState } from "react";
import type { Draft, DocStyle, Skin, Toggles } from "./types";
import { contrastRatio, passesWcagAA } from "./contrast";
import Select from "./Select";
import {
  DownloadIcon,
  FileTextIcon,
  MoonIcon,
  PanelCollapseRightIcon,
  PrinterIcon,
  RotateCcwIcon,
  SunIcon,
  XIcon,
} from "./icons";

/*
  The fourth column. Three of its four blocks are things the previous
  three columns used to own: the skin picker lived in the toolbar, the
  clause toggles lived at the bottom of the form. They moved here rather
  than being copied, so Toolbar and FormPanel no longer render them at
  all (see those files).

  A Readiness block used to live here too (every unfilled required field,
  fourteen items deep), but the toolbar's completion ring already reports
  the same information as a single percentage, so the list was removed
  along with the accordion-group lookup and jump-to-field wiring that
  existed only to serve it (see schema.ts, FormPanel.tsx and
  ContractGenerator.tsx).

  Layout: a real grid column at >= 1536px (.cgGrid gets a fourth track),
  an overlay everywhere below that (see contract.css's .cgSide rules).
  `open` and `onClose` only matter for the overlay case; at >= 1536 the
  panel is always visible and CSS ignores them.
*/

const SKIN_INFO: { id: Skin; label: string; hint: string }[] = [
  { id: "studio", label: "Studio", hint: "The house look" },
  { id: "editorial", label: "Editorial", hint: "A serif display with generous leading" },
  { id: "plain", label: "Plain", hint: "The most compact, built for legal reading" },
];

/* moved out of FormPanel wholesale, not copied: FormPanel no longer
   renders a clauses group or this array at all */
const TOGGLE_LABELS: { name: keyof Toggles; label: string; hint: string }[] = [
  { name: "attribution", label: "Attribution & Portfolio Rights", hint: "Lets you publish the work" },
  { name: "confidentiality", label: "Confidentiality & Non-Solicitation", hint: "Two year NDA, six month non-solicit" },
  { name: "warranties", label: "Warranties & Liability", hint: "Caps your liability at the fee" },
  { name: "termination", label: "Termination & Suspension", hint: "Kill fee and hold terms" },
  { name: "lateFee", label: "Late payment charge", hint: "A sub clause inside Fees, not its own section" },
];

/* the six self-hosted families app/layout.tsx offers that suit a legal
   document; the other three (Caveat, Permanent Marker, Grenze Gotisch)
   are the About page's handwriting/marker/gothic collage faces and have
   no business setting a contract, and Cinzel Decorative is a display cut
   of Cinzel meant for large ornamental type, not body or heading text.
   "" is "skin default" - see DEFAULT_DOC_STYLE in useDocStyle.ts. */
const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Skin default" },
  { value: "var(--font-general)", label: "General Sans" },
  { value: "var(--font-inter)", label: "Inter" },
  { value: "var(--font-archivo)", label: "Archivo" },
  { value: "var(--font-serif)", label: "Instrument Serif" },
  { value: "var(--font-cinzel)", label: "Cinzel" },
  { value: 'ui-monospace, "SF Mono", monospace', label: "System Mono" },
];

/* mirrors --cg-paper/--cg-paper-fg's light and dark values in
   contract.css exactly. Used only as the contrast readout's baseline
   for whichever colour the user has NOT set (see effectiveColor below)
   - never applied to the document itself, which gets its actual default
   from the CSS fallback chain (var(--cg-doc-bg, var(--cg-paper))), not
   from this constant. Keeping the two in sync is a comment's job, not
   code's: there is no way to read a CSS custom property's value out of
   contract.css from here without a DOM round trip, and this is a
   readout, not the styling mechanism itself. */
const PAPER_DEFAULT: Record<"light" | "dark", { bg: string; fg: string }> = {
  light: { bg: "#ffffff", fg: "#1f1f1f" },
  dark: { bg: "#1e1e1e", fg: "#ece8e1" },
};

type Props = {
  draft: Draft;
  setToggle: (name: keyof Toggles, value: boolean) => void;
  skin: Skin;
  onSkin: (s: Skin) => void;
  /* the screen theme, needed only for the contrast readout's baseline
     (see PAPER_DEFAULT above) - never written back to the document,
     which stays on its own axis per the "app chrome tokens stay on
     .cgShell[data-cg-theme=...]" rule */
  theme: "light" | "dark";
  style: DocStyle;
  setStyleField: <K extends keyof DocStyle>(name: K, value: DocStyle[K]) => void;
  logo: string | null;
  /* whichever of logo.ts's own validation or useDocLogo's storage-quota
     error fired most recently; null when there is nothing to report */
  logoMessage: string | null;
  onLogoFile: (file: File) => void;
  onRemoveLogo: () => void;
  onPrint: () => void;
  onWord: () => void;
  onMarkdown: () => void;
  open: boolean;
  onClose: () => void;
  /* the panel's own collapse rail, only meaningful once it is docked as a
     real grid column (>=1536px, see useIsDocked below and .cgPanelRail in
     contract.css); the overlay case below that already has its own full
     close affordance (the header's X and the backdrop), so it never reads
     this or renders the control that would set it */
  collapsed: boolean;
  onToggleCollapse: () => void;
  /* whether the phone-width Design tab (see MobileTabBar.tsx) is the
     current tab - just the tab-derived signal, no width knowledge. This
     component combines it with its own useIsMobileNav below, the same
     split useIsDocked already keeps: ContractGenerator owns state, this
     component owns which width that state actually matters at. */
  mobileActive: boolean;
  /* Reset and the theme toggle, needed only for the small block rendered
     inside the Design tab below 1100px (see useIsMobileNav) - at every
     other width these stay solely in Toolbar and this component never
     reads them */
  onReset: () => void;
  onTheme: () => void;
};

/* whether the panel is currently docked as its own grid column (>=1536px)
   rather than an overlay; only affects focus/inert handling, the layout
   itself is CSS's job. Starts false so server and first client paint
   agree, then corrects itself on mount like the route's theme default. */
function useIsDocked(): boolean {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1536px)");
    const update = () => setDocked(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return docked;
}

/* the other end of the range useIsDocked watches: below 1100px the panel
   is neither a docked column nor an overlay, it is the Design tab's whole
   content (see contract.css's matching @media block and MobileTabBar.tsx).
   Same start-false-then-correct-on-mount shape as useIsDocked, for the
   same reason - server and first client paint have to agree. */
function useIsMobileNav(): boolean {
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1099px)");
    const update = () => setMobileNav(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobileNav;
}

export default function SidePanel({
  draft, setToggle, skin, onSkin, theme, style, setStyleField, logo, logoMessage, onLogoFile,
  onRemoveLogo, onPrint, onWord, onMarkdown, open, onClose,
  collapsed, onToggleCollapse, mobileActive, onReset, onTheme,
}: Props) {
  const docked = useIsDocked();
  const mobileNav = useIsMobileNav();
  const panelRef = useRef<HTMLDivElement>(null);
  /* visible: whether the panel is actually on screen right now, regardless
     of how - docked (always), the 1100-1535px overlay (open), or the
     Design tab below 1100px (mobileActive). Drives `inert` below, which
     must never leave a visually-shown panel non-interactive.
     overlayVisible narrows that to just the overlay case, since the
     backdrop and Escape-to-close only make sense there - below 1100px
     there is nothing to "close" to, only another tab to switch to, and
     CSS hides the backdrop at that width regardless (see contract.css). */
  const visible = docked || (mobileNav ? mobileActive : open);
  const overlayVisible = !docked && !mobileNav && open;

  /* closing hands focus back to the toolbar toggle that opened the
     overlay, the same return-focus contract Toolbar's own Export menu
     keeps for its trigger */
  const handleClose = () => {
    onClose();
    document.getElementById("cg-side-toggle")?.focus();
  };

  useEffect(() => {
    if (!overlayVisible) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayVisible]);

  const exportItems: {
    id: string;
    label: string;
    hint: string;
    Icon: typeof PrinterIcon;
    run: () => void;
  }[] = [
    { id: "pdf", label: "Save as PDF", hint: "Opens the print dialog, A4", Icon: PrinterIcon, run: onPrint },
    { id: "word", label: "Word (.doc)", hint: "Editable in Word, Pages, Docs", Icon: FileTextIcon, run: onWord },
    { id: "md", label: "Markdown (.md)", hint: "Plain text", Icon: DownloadIcon, run: onMarkdown },
  ];

  /* what the contrast readout scores: the user's own pick where they
     made one, otherwise the same baseline the CSS fallback chain itself
     lands on for the active theme (see PAPER_DEFAULT above and .cgDoc's
     var(--cg-doc-bg, var(--cg-paper)) in contract.css) - heading with no
     explicit colour inherits the text colour in the real document
     (color: var(--cg-doc-heading-color, inherit)), so its effective
     value here does the same rather than assuming the theme default. */
  const paperDefault = PAPER_DEFAULT[theme];
  const effectiveBg = style.background || paperDefault.bg;
  const effectiveText = style.text || paperDefault.fg;
  const effectiveHeading = style.heading || effectiveText;
  const bodyRatio = contrastRatio(effectiveText, effectiveBg);
  const headingRatio = contrastRatio(effectiveHeading, effectiveBg);

  /* docked and collapsed: the whole panel reduces to a narrow rail with
     just the control that expands it again, mirroring FormPanel's own
     collapsed state. Not offered while the panel is an overlay (below
     1536px), where it is either fully open or fully closed already. */
  if (docked && collapsed) {
    return (
      <div
        id="cg-side-panel"
        className="cgSide"
        ref={panelRef}
        tabIndex={-1}
        aria-label="Document panel"
      >
        <div className="cgPanelRail">
          <button
            type="button"
            className="cgGhost"
            aria-expanded={false}
            aria-label="Expand document panel"
            onClick={onToggleCollapse}
          >
            <PanelCollapseRightIcon />
          </button>
          <span className="cgPanelRail__label" aria-hidden="true">Document</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id="cg-side-panel"
        className="cgSide"
        ref={panelRef}
        tabIndex={-1}
        aria-label="Document panel"
        inert={!visible ? true : undefined}
      >
        {!docked && !mobileNav && (
          <div className="cgSide__header">
            <p className="cgSide__title">Panel</p>
            <button
              type="button"
              className="cgGhost cgSide__close"
              onClick={handleClose}
              aria-label="Close panel"
            >
              <XIcon />
            </button>
          </div>
        )}

        {docked && (
          <div className="cgSide__bar">
            <p className="cgForm__eyebrow">Document</p>
            <button
              type="button"
              className="cgGhost"
              aria-expanded={true}
              aria-label="Collapse document panel"
              onClick={onToggleCollapse}
            >
              <PanelCollapseRightIcon />
            </button>
          </div>
        )}

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Skin</p>
          <div className="cgSide__radiogroup" role="radiogroup" aria-label="Document skin">
            {SKIN_INFO.map((s, i) => (
              <SkinRow
                key={s.id}
                skin={s}
                selected={skin === s.id}
                onSelect={() => onSkin(s.id)}
                onArrow={(dir) => {
                  const next = (i + dir + SKIN_INFO.length) % SKIN_INFO.length;
                  onSkin(SKIN_INFO[next].id);
                }}
              />
            ))}
          </div>
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Colors</p>
          <ColorField
            id="cg-style-accent"
            label="Accent"
            value={style.accent}
            effective={style.accent || "#7c3aed"}
            onChange={(hex) => setStyleField("accent", hex)}
            onClear={() => setStyleField("accent", "")}
          />
          <ColorField
            id="cg-style-heading"
            label="Heading"
            value={style.heading}
            effective={effectiveHeading}
            onChange={(hex) => setStyleField("heading", hex)}
            onClear={() => setStyleField("heading", "")}
          />
          <ColorField
            id="cg-style-background"
            label="Background"
            value={style.background}
            effective={effectiveBg}
            onChange={(hex) => setStyleField("background", hex)}
            onClear={() => setStyleField("background", "")}
          />
          <ColorField
            id="cg-style-text"
            label="Text"
            value={style.text}
            effective={effectiveText}
            onChange={(hex) => setStyleField("text", hex)}
            onClear={() => setStyleField("text", "")}
          />

          {/* factual, not a gate: every choice above works regardless of
              what this reports (see the comment on the CSS block) */}
          <div className="cgContrast">
            <ContrastRow label="Text on background" ratio={bodyRatio} level="body" />
            <ContrastRow label="Heading on background" ratio={headingRatio} level="large" />
          </div>
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Typography</p>
          <FontField
            id="cg-style-title-font"
            label="Title"
            value={style.titleFont}
            onChange={(v) => setStyleField("titleFont", v)}
          />
          <FontField
            id="cg-style-heading-font"
            label="Heading"
            value={style.headingFont}
            onChange={(v) => setStyleField("headingFont", v)}
          />
          <FontField
            id="cg-style-body-font"
            label="Body"
            value={style.bodyFont}
            onChange={(v) => setStyleField("bodyFont", v)}
          />
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Logo</p>
          <LogoField logo={logo} message={logoMessage} onFile={onLogoFile} onRemove={onRemoveLogo} />
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Clauses</p>
          {TOGGLE_LABELS.map((t) => (
            <label className="cgSwitch" key={t.name}>
              <input
                type="checkbox"
                checked={draft.toggles[t.name]}
                onChange={(e) => setToggle(t.name, e.target.checked)}
              />
              <span className="cgSwitch__track" aria-hidden />
              <span className="cgSwitch__text">
                {t.label}
                <span className="cgSwitch__hint">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="cgSide__block">
          <p className="cgSide__eyebrow">Export</p>
          <div className="cgSide__exportList">
            {exportItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cgSide__exportRow"
                onClick={item.run}
              >
                <item.Icon className="cgSide__exportIcon" />
                <span className="cgSide__exportText">
                  {item.label}
                  <span className="cgSide__exportHint">{item.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Reset and the theme toggle: moved here from the toolbar below
            1100px (see Toolbar.tsx's .cgBar__reset/.cgBar__theme, hidden
            at that width in contract.css) because the top bar only has
            room left for the back link and Export there. Both stay
            infrequent, low-stakes controls - last in the Design tab
            rather than first, the same "don't compete with the primary
            action" reasoning that already keeps Reset out of the way in
            the toolbar itself. Reuses .cgBar__reset/.cgGhost as-is rather
            than inventing a third visual for the same two actions. */}
        {mobileNav && (
          <div className="cgSide__block">
            <p className="cgSide__eyebrow">Reset &amp; theme</p>
            <div className="cgSide__mobileControls">
              <button
                type="button"
                className="cgBar__reset"
                onClick={onReset}
                aria-label="Reset all fields and hand-edited text to their defaults"
              >
                <RotateCcwIcon />
                <span>Reset</span>
              </button>
              <button
                type="button"
                className="cgGhost"
                onClick={onTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              </button>
            </div>
          </div>
        )}
      </div>

      {overlayVisible && (
        <button
          type="button"
          className="cgSide__backdrop"
          aria-label="Close panel"
          onClick={handleClose}
        />
      )}
    </>
  );
}

/*
  One row of the skin radiogroup. Arrow keys move and select in one step
  (the native <input type="radio"> behaviour this role="radio" markup is
  standing in for), so only the checked row is ever in the tab order.
*/
function SkinRow({
  skin, selected, onSelect, onArrow,
}: {
  skin: { id: Skin; label: string; hint: string };
  selected: boolean;
  onSelect: () => void;
  onArrow: (dir: 1 | -1) => void;
}) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onArrow(1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onArrow(-1);
    }
  };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      className="cgSide__skinRow"
      data-selected={selected}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className="cgSide__skinName">{skin.label}</span>
      <span className="cgSide__skinHint">{skin.hint}</span>
    </button>
  );
}

/*
  One colour: a native <input type="color"> swatch plus a plain text
  hex field, never the swatch alone - a colour value that can only be
  read by eye is not something a keyboard user or a screen reader can
  confirm, and typing a hex is faster than eyeballing a picker anyway.

  `value` is the DocStyle field itself and may be "" (not set, see
  DEFAULT_DOC_STYLE). `effective` is what the document actually renders
  for this role right now - the resolved skin/theme default, or the
  user's own value when they have set one (SidePanel computes this per
  field; see effectiveHeading/effectiveBg/effectiveText above). The
  swatch and the hex field both display `effective` whenever `value` is
  unset, so what is shown always matches what is on the page, and never
  shows an arbitrary placeholder colour.

  The hex text field keeps its own local buffer rather than being fully
  controlled by `value`: a controlled input that snaps back to the last
  valid hex on every keystroke makes it impossible to type a new one
  (see the commit-on-valid comment below).
*/
function ColorField({
  id, label, value, effective, onChange, onClear,
}: {
  id: string;
  label: string;
  value: string;
  effective: string;
  onChange: (hex: string) => void;
  onClear: () => void;
}) {
  const shown = value || effective;
  const [text, setText] = useState(shown);

  useEffect(() => {
    setText(shown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  const commit = (raw: string) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(raw.trim());
    if (m) onChange(`#${m[1].toLowerCase()}`);
  };

  return (
    <div className="cgField">
      <label className="cgField__label" htmlFor={`${id}-hex`}>{label}</label>
      <div className="cgColorField">
        <input
          type="color"
          id={id}
          className="cgColorField__swatch"
          aria-label={`${label} colour picker`}
          value={shown}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          id={`${id}-hex`}
          className="cgInput cgColorField__hex"
          value={text}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setText(shown)}
        />
        {value !== "" && (
          <button
            type="button"
            className="cgGhost cgColorField__reset"
            aria-label={`Reset ${label} to the skin default`}
            onClick={onClear}
          >
            <XIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/* honest, not alarming: the ratio is always shown, "Pass"/"Low contrast"
   is text (never colour alone), and a failing reading is a slightly
   heavier weight, not a red banner - see the CSS comment on .cgContrast.
   ratio is null when a colour cannot be parsed yet (mid-edit in the hex
   field above), which reads as a plain em dash rather than "Low
   contrast" so an in-progress edit is never reported as a failure. */
function ContrastRow({
  label, ratio, level,
}: {
  label: string;
  ratio: number | null;
  level: "body" | "large";
}) {
  const pass = ratio !== null && passesWcagAA(ratio, level);
  const threshold = level === "body" ? "4.5" : "3";
  return (
    <div className="cgContrast__row">
      <span className="cgContrast__label">{label}</span>
      <span>
        <span className="cgContrast__ratio">{ratio !== null ? `${ratio.toFixed(2)}:1` : "-"}</span>
        {ratio !== null && (
          <>
            {" "}
            <span className="cgContrast__verdict" data-pass={pass}>
              {pass ? "Pass" : `Below ${threshold}:1`}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

/* one of the six sanctioned families (see FONT_OPTIONS) or "" for the
   skin's own default - a plain <select>, reusing .cgField/.cgInput from
   the form panel rather than inventing a second field style */
function FontField({
  id, label, value, onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="cgField">
      <label className="cgField__label" htmlFor={id}>{label}</label>
      <Select id={id} value={value} options={FONT_OPTIONS} onChange={onChange} />
    </div>
  );
}

const LOGO_ACCEPT = "image/png,image/jpeg,image/svg+xml";

/*
  The file input is visually hidden with the same technique .cgSwitch's
  checkbox already uses (absolute, 1x1px, opacity: 0) rather than
  display:none, so it stays in the tab order and Enter/Space still opens
  the OS file dialog; the label next to it carries the visible "Upload
  logo" affordance and the focus ring moves to that label via
  `:focus-visible + .cgLogo__browse` in contract.css, since outlining a
  1x1px element would not be visible.

  Processing (downscaling, the 2MB/size checks) happens in logo.ts,
  called by ContractGenerator's onLogoFile; this component only ever
  hands over the raw File and renders whatever comes back (a preview, or
  `message` from either that validation or useDocLogo's storage-quota
  handling).
*/
function LogoField({
  logo, message, onFile, onRemove,
}: {
  logo: string | null;
  message: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    /* clear the input's own value so picking the same file again (after
       a rejection, say) still fires a change event */
    e.target.value = "";
  };

  return (
    <div className="cgLogo">
      {logo ? (
        <div className="cgLogo__preview">
          <img src={logo} alt="" className="cgLogo__thumb" />
          <span className="cgLogo__meta">Logo set. Shown above the title on the page, print and Word export.</span>
          <button
            type="button"
            className="cgLogo__remove"
            aria-label="Remove logo"
            onClick={() => {
              onRemove();
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <XIcon />
          </button>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            id="cg-logo-file"
            className="cgLogo__file"
            accept={LOGO_ACCEPT}
            onChange={handleChange}
          />
          <label htmlFor="cg-logo-file" className="cgLogo__browse">
            Upload logo (PNG, JPEG or SVG, under 2MB)
          </label>
        </>
      )}
      {message && <p className="cgLogo__error" role="status">{message}</p>}
    </div>
  );
}
