"use client";

import { useEffect, useRef, useState } from "react";
import { PencilIcon } from "./icons";

/*
  The "Edit content" control, above the document in the paper column
  (Task 2). Off, this is a single toggle and DocPaper renders exactly as
  it always has. On, it grows a control bar (Save / Cancel / Revert to
  default) and DocPaper turns its overridable blocks into editable text
  (see the `editable` prop DocPaper accepts).

  Save and Cancel both exit edit mode, so the toggle itself never needs a
  third "turn edit mode off directly" affordance - clicking it again
  while on is wired to the same discard-and-exit behaviour Cancel gives,
  which is why `onCancel` is what fires on both. Whichever of the three
  buttons exits, focus returns to this toggle rather than to whatever
  page node happens to be left in the closing control bar's place, since
  Save/Cancel/Revert unmount the moment edit mode flips off and this
  button is the one thing in this bar that does not.

  Filled-control rule (see contract.css and the CLAUSES/EXPORT comment
  in SidePanel.tsx): Export is normally the only filled control on this
  page. Editing changes what the primary action is, so ContractGenerator
  passes `editMode` down to Toolbar too, which drops Export to a ghost
  for exactly as long as Save here is filled - never both, never neither.
*/

type Props = {
  editMode: boolean;
  onEnter: () => void;
  onCancel: () => void;
  onSave: () => void;
  onRevertAll: () => void;
};

export default function EditBar({ editMode, onEnter, onCancel, onSave, onRevertAll }: Props) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const revertTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelConfirmRef = useRef<HTMLButtonElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  /* every exit path (Save, Cancel, or the toggle acting as Cancel) hands
     focus back here in the same tick, so it never lands on a button that
     is about to disappear */
  const exit = (run: () => void) => {
    run();
    toggleRef.current?.focus();
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    revertTriggerRef.current?.focus();
  };

  const confirmRevert = () => {
    onRevertAll();
    closeConfirm();
  };

  useEffect(() => {
    if (!confirmOpen) return;
    /* the least destructive option gets initial focus, not the button
       that just opened this */
    cancelConfirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmOpen]);

  return (
    <div className="cgEditBar">
      <button
        type="button"
        ref={toggleRef}
        className="cgEditBar__toggle"
        aria-pressed={editMode}
        onClick={editMode ? () => exit(onCancel) : onEnter}
      >
        <PencilIcon /> Edit content
      </button>

      {editMode && (
        <div className="cgEditBar__actions">
          <button
            type="button"
            ref={revertTriggerRef}
            className="cgGhostLabel"
            onClick={() => setConfirmOpen(true)}
          >
            Revert to default
          </button>
          <button type="button" className="cgGhostLabel" onClick={() => exit(onCancel)}>
            Cancel
          </button>
          <button type="button" className="cgPrimary" onClick={() => exit(onSave)}>
            Save
          </button>
        </div>
      )}

      {confirmOpen && (
        <>
          <button
            type="button"
            className="cgSide__backdrop cgConfirm__backdrop"
            aria-label="Dismiss"
            onClick={closeConfirm}
          />
          <div
            className="cgConfirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cg-confirm-title"
            aria-describedby="cg-confirm-desc"
          >
            <p id="cg-confirm-title" className="cgConfirm__title">Revert to default?</p>
            <p id="cg-confirm-desc" className="cgConfirm__body">
              This clears every hand-edited block in the whole document, not just the one you
              were looking at, and cannot be undone.
            </p>
            <div className="cgConfirm__actions">
              <button type="button" ref={cancelConfirmRef} className="cgGhostLabel" onClick={closeConfirm}>
                Cancel
              </button>
              <button type="button" className="cgConfirm__danger" onClick={confirmRevert}>
                Revert everything
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
