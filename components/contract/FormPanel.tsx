"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { GROUPS, type Field } from "./schema";
import type { Draft, Toggles } from "./types";

type Props = {
  draft: Draft;
  setField: <K extends keyof Draft>(name: K, value: Draft[K]) => void;
  setToggle: (name: keyof Toggles, value: boolean) => void;
  setDeliverables: (items: string[]) => void;
  reset: () => void;
};

const TOGGLE_LABELS: { name: keyof Toggles; label: string; hint: string }[] = [
  { name: "attribution", label: "Attribution & Portfolio Rights", hint: "Lets you publish the work" },
  { name: "confidentiality", label: "Confidentiality & Non-Solicitation", hint: "Two year NDA, six month non-solicit" },
  { name: "warranties", label: "Warranties & Liability", hint: "Caps your liability at the fee" },
  { name: "termination", label: "Termination & Suspension", hint: "Kill fee and hold terms" },
  { name: "lateFee", label: "Late payment charge", hint: "A sub clause inside Fees, not its own section" },
];

export default function FormPanel({ draft, setField, setToggle, setDeliverables, reset }: Props) {
  const [open, setOpen] = useState<string>("designer");
  const reduce = useReducedMotion();

  return (
    <div className="cgForm">
      <p className="cgForm__eyebrow">Contract Data</p>

      {GROUPS.map((g) => {
        const isOpen = open === g.id;
        const req = g.fields.filter((f) => f.required);
        const done = req.filter((f) => {
          const val = draft[f.name];
          return Array.isArray(val) ? val.length > 0 : String(val ?? "").trim().length > 0;
        }).length;

        return (
          <div className="cgAcc" key={g.id}>
            <button
              type="button"
              className="cgAcc__head"
              id={`cg-head-${g.id}`}
              aria-expanded={isOpen}
              aria-controls={`cg-panel-${g.id}`}
              onClick={() => setOpen(isOpen ? "" : g.id)}
            >
              <span className="cgAcc__label">{g.label}</span>
              {req.length > 0 && (
                <span className="cgAcc__count">{done}/{req.length}</span>
              )}
              <span className="cgAcc__chev" aria-hidden data-open={isOpen}>&#9662;</span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.section
                  id={`cg-panel-${g.id}`}
                  role="region"
                  aria-labelledby={`cg-head-${g.id}`}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? { height: 0 } : { height: 0, opacity: 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="cgAcc__body">
                    {g.id === "clauses"
                      ? TOGGLE_LABELS.map((t) => (
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
                        ))
                      : g.fields.map((f) => (
                          <FieldRow
                            key={String(f.name)}
                            field={f}
                            draft={draft}
                            setField={setField}
                            setDeliverables={setDeliverables}
                          />
                        ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <button type="button" className="cgForm__reset" onClick={reset}>
        Reset all
      </button>
    </div>
  );
}

function FieldRow({
  field, draft, setField, setDeliverables,
}: {
  field: Field;
  draft: Draft;
  setField: Props["setField"];
  setDeliverables: Props["setDeliverables"];
}) {
  const id = `cg-${String(field.name)}`;

  if (field.type === "list") {
    const items = draft.deliverables;
    return (
      <div className="cgField" data-half={false}>
        <span className="cgField__label" id={`${id}-label`}>{field.label}</span>
        <div className="cgList" role="group" aria-labelledby={`${id}-label`}>
          {items.map((item, i) => (
            <div className="cgList__row" key={i}>
              <input
                className="cgInput"
                value={item}
                aria-label={`${field.label} ${i + 1}`}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = e.target.value;
                  setDeliverables(next);
                }}
              />
              <button
                type="button"
                className="cgList__rm"
                aria-label={`Remove ${field.label} ${i + 1}`}
                onClick={() => setDeliverables(items.filter((_, j) => j !== i))}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            className="cgList__add"
            onClick={() => setDeliverables([...items, ""])}
          >
            + {field.placeholder ?? "Add"}
          </button>
        </div>
      </div>
    );
  }

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
        <select
          id={id}
          className="cgInput"
          value={value}
          onChange={(e) => setField(field.name, e.target.value as Draft[typeof field.name])}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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
