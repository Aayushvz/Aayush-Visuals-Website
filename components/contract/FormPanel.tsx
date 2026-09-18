"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useIsPresent, useReducedMotion } from "framer-motion";
import { GROUPS, type Field } from "./schema";
import type { Draft } from "./types";
import { PERSON_NAME, SOCIAL_PROFILES } from "@/lib/site";
import Select from "./Select";
import DateField from "./DateField";
import {
  BehanceIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  CardIcon,
  ChevronDownIcon,
  InstagramIcon,
  LinkedInIcon,
  PanelCollapseLeftIcon,
  PersonIcon,
  PlusIcon,
  ScaleIcon,
  XIcon,
} from "./icons";

/* One icon per accordion group, keyed by group id rather than lined up
   positionally with GROUPS: a lookup by id cannot silently drift out of
   sync if a group is reordered, renamed, or a new one is inserted, the
   way a parallel array indexed by position could. Fees & Payment gets a
   generic card mark rather than a currency symbol, since the tool prices
   in INR, USD, EUR and GBP and a single symbol would misdescribe three
   of the four. */
const GROUP_ICONS: Record<string, typeof PersonIcon> = {
  designer: PersonIcon,
  client: BuildingIcon,
  project: BriefcaseIcon,
  fees: CardIcon,
  timeline: CalendarIcon,
  jurisdiction: ScaleIcon,
};

/* Only three of the four profiles in lib/site.ts belong here (no GitHub);
   matched by hostname rather than array position so a reorder of
   SOCIAL_PROFILES cannot silently swap a label onto the wrong URL. */
type SocialSource = { match: string; label: string; Icon: typeof BehanceIcon };

const SOCIAL_SOURCES: SocialSource[] = [
  { match: "behance.net", label: "Behance", Icon: BehanceIcon },
  { match: "instagram.com", label: "Instagram", Icon: InstagramIcon },
  { match: "linkedin.com", label: "LinkedIn", Icon: LinkedInIcon },
];

const SOCIAL_LINKS = SOCIAL_SOURCES.map((s) => ({
  ...s,
  href: SOCIAL_PROFILES.find((url) => url.includes(s.match)),
})).filter((s): s is SocialSource & { href: string } => Boolean(s.href));

/* whether the form is currently docked as a real grid column (>=1100px)
   rather than governed by the tab strip; mirrors SidePanel's own
   useIsDocked at its own breakpoint (see contract.css's matching
   @media (min-width: 1100px) collapse override). Only gates whether the
   collapsed rail actually renders: below this width the tab strip
   already owns showing the whole panel full width, and a collapsed rail
   inside that single column would just be a stranded button. */
function useIsDocked(): boolean {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const update = () => setDocked(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return docked;
}

type Props = {
  draft: Draft;
  setField: <K extends keyof Draft>(name: K, value: Draft[K]) => void;
  setDeliverables: (items: string[]) => void;
  /* the panel's own collapse rail (see .cgPanelRail in contract.css and
     the collapse control in ContractGenerator); state lives one level up
     because it has to survive FormPanel unmounting nothing, but mainly
     to match how every other cross-cutting bit of chrome on this route
     (theme, skin, tab) is owned by ContractGenerator */
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function FormPanel({
  draft, setField, setDeliverables,
  collapsed, onToggleCollapse,
}: Props) {
  const [open, setOpen] = useState<string>("designer");
  const reduce = useReducedMotion();
  const docked = useIsDocked();

  if (collapsed && docked) {
    return (
      <div className="cgForm">
        <div className="cgPanelRail">
          <button
            type="button"
            className="cgGhost"
            aria-expanded={false}
            aria-label="Expand agreement details"
            onClick={onToggleCollapse}
          >
            <PanelCollapseLeftIcon />
          </button>
          <span className="cgPanelRail__label" aria-hidden="true">Agreement Details</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cgForm">
      <div className="cgForm__bar">
        <p className="cgForm__eyebrow">Agreement Details</p>
        <button
          type="button"
          className="cgGhost cgPanelToggle"
          aria-expanded={true}
          aria-label="Collapse agreement details"
          onClick={onToggleCollapse}
        >
          <PanelCollapseLeftIcon />
        </button>
      </div>

      {GROUPS.map((g) => {
        const isOpen = open === g.id;
        const req = g.fields.filter((f) => f.required);
        const done = req.filter((f) => {
          const val = draft[f.name];
          return Array.isArray(val) ? val.length > 0 : String(val ?? "").trim().length > 0;
        }).length;
        const GroupIcon = GROUP_ICONS[g.id];

        return (
          <div className="cgAcc" key={g.id}>
            <button
              type="button"
              className="cgAcc__head"
              id={`cg-head-${g.id}`}
              aria-expanded={isOpen}
              aria-controls={`cg-panel-${g.id}`}
              onClick={(e) => {
                setOpen(isOpen ? "" : g.id);
                /* Clicking a different header closes the currently open
                   panel. That panel is marked inert as soon as it starts
                   exiting (see AccordionPanel), but a click does not focus
                   a <button> in every browser (Safari does not), so if the
                   user's focus was inside the closing panel it could be
                   left on a node that just went inert. Move focus to the
                   header that was actually clicked, the natural landing
                   spot, rather than trusting default click-to-focus. */
                e.currentTarget.focus();
              }}
            >
              {GroupIcon && <GroupIcon className="cgAcc__icon" />}
              <span className="cgAcc__label">{g.label}</span>
              {req.length > 0 && (
                <span className="cgAcc__count">{done}/{req.length}</span>
              )}
              <span className="cgAcc__chev" aria-hidden data-open={isOpen}>
                <ChevronDownIcon />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <AccordionPanel groupId={g.id} reduce={Boolean(reduce)}>
                  {g.fields.map((f) =>
                    f.type === "list" ? (
                      <DeliverablesList
                        key={String(f.name)}
                        field={f}
                        draft={draft}
                        setDeliverables={setDeliverables}
                      />
                    ) : (
                      <FieldRow
                        key={String(f.name)}
                        field={f}
                        draft={draft}
                        setField={setField}
                      />
                    ),
                  )}
                </AccordionPanel>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <div className="cgFoot">
        <p className="cgFoot__credit">Made by {PERSON_NAME}</p>
        {SOCIAL_LINKS.length > 0 && (
          <div className="cgFoot__socials" role="group" aria-label="Elsewhere">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                className="cgFoot__social"
                aria-label={s.label}
              >
                <s.Icon />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/*
  The exiting panel of an AnimatePresence stays mounted, tabbable and
  focusable for the whole exit transition: once the parent stops
  rendering it (isOpen flips false), AnimatePresence keeps its last
  known props frozen and animates it out on its own, so a prop computed
  from the parent's `isOpen` cannot reach it after that point. useIsPresent
  is a context read from *inside* this component, so it keeps updating on
  its own schedule and flips to false the instant the exit starts,
  independent of when the (possibly multi-hundred-ms) exit animation
  finishes. `inert` removes the closing panel and everything in it from
  the tab order and from assistive tech immediately, rather than waiting
  for onExitComplete or unmount.
*/
function AccordionPanel({
  groupId, reduce, children,
}: {
  groupId: string;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const isPresent = useIsPresent();

  return (
    <motion.section
      id={`cg-panel-${groupId}`}
      role="region"
      aria-labelledby={`cg-head-${groupId}`}
      inert={!isPresent}
      initial={reduce ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={reduce ? { height: 0 } : { height: 0, opacity: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{ overflow: "hidden" }}
    >
      <div className="cgAcc__body">{children}</div>
    </motion.section>
  );
}

/*
  The deliverables row editor.

  Rows were originally keyed by array index, so removing a row above the
  one a user is typing into makes React reconcile the focused <input> in
  place while its underlying value silently swaps to a different
  deliverable's text. `deliverables` itself must stay a plain string[]
  (persisted to localStorage, consumed by clauses.ts, asserted as
  string[] in earlier tasks' tests), so the fix keeps a parallel array of
  stable synthetic ids in local state instead, and keys each row on its
  id rather than its position.

  That id array can be invalidated from outside this component: the
  toolbar's `Reset` button (see Toolbar.tsx) empties `draft.deliverables`
  directly, and a restored localStorage draft replaces it on mount. Both
  change the array's length without going through handleAdd/handleRemove
  below, so on every render this checks whether the id array and the
  value array have drifted apart and resynchronises by minting fresh ids
  rather than rendering a mismatch.
*/
function DeliverablesList({
  field, draft, setDeliverables,
}: {
  field: Field;
  draft: Draft;
  setDeliverables: Props["setDeliverables"];
}) {
  const items = draft.deliverables;
  const id = `cg-${String(field.name)}`;
  const nextId = useRef(items.length);
  const [rowIds, setRowIds] = useState<number[]>(() => items.map((_, i) => i));
  const [syncedLength, setSyncedLength] = useState(items.length);

  if (items.length !== syncedLength) {
    setRowIds(items.map(() => nextId.current++));
    setSyncedLength(items.length);
  }

  const handleEdit = (i: number, value: string) => {
    const next = [...items];
    next[i] = value;
    setDeliverables(next);
  };

  const handleRemove = (i: number) => {
    setDeliverables(items.filter((_, j) => j !== i));
    setRowIds((prev) => prev.filter((_, j) => j !== i));
    setSyncedLength(items.length - 1);
  };

  const handleAdd = () => {
    setDeliverables([...items, ""]);
    setRowIds((prev) => [...prev, nextId.current++]);
    setSyncedLength(items.length + 1);
  };

  return (
    <div className="cgField" data-half={false}>
      <span className="cgField__label" id={`${id}-label`}>{field.label}</span>
      <div className="cgList" id={id} role="group" aria-labelledby={`${id}-label`}>
        {items.map((item, i) => (
          <div className="cgList__row" key={rowIds[i] ?? i}>
            <input
              className="cgInput"
              value={item}
              aria-label={`${field.label} ${i + 1}`}
              onChange={(e) => handleEdit(i, e.target.value)}
            />
            <button
              type="button"
              className="cgList__rm"
              aria-label={`Remove ${field.label} ${i + 1}`}
              onClick={() => handleRemove(i)}
            >
              <XIcon />
            </button>
          </div>
        ))}
        <button type="button" className="cgList__add" onClick={handleAdd}>
          <PlusIcon /> {field.placeholder ?? "Add"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({
  field, draft, setField,
}: {
  field: Field;
  draft: Draft;
  setField: Props["setField"];
}) {
  const id = `cg-${String(field.name)}`;
  const value = String(draft[field.name] ?? "");

  return (
    <div className="cgField" data-half={Boolean(field.half)}>
      <label className="cgField__label" htmlFor={id}>
        {field.label}
        {!field.required && <span className="cgField__opt"> optional</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={id}
          className="cgInput cgInput--area"
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => setField(field.name, e.target.value as Draft[typeof field.name])}
        />
      ) : field.type === "select" ? (
        <Select
          id={id}
          value={value}
          options={field.options ?? []}
          onChange={(v) => setField(field.name, v as Draft[typeof field.name])}
        />
      ) : field.type === "date" ? (
        <DateField
          id={id}
          value={value}
          onChange={(v) => setField(field.name, v as Draft[typeof field.name])}
        />
      ) : (
        <input
          id={id}
          className="cgInput"
          type={field.type}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => setField(field.name, e.target.value as Draft[typeof field.name])}
        />
      )}
    </div>
  );
}
