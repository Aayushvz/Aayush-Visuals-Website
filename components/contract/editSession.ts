/*
  How a Save click leaves edit mode, pulled out of EditBar.tsx so the
  order its steps run in is real, exported code rather than an
  arrangement of statements inside a JSX component that no test can
  reach. The fold it runs in the middle is commitPending, which lives
  with the other pure override helpers in useOverrides.ts.

  This file exists because of a bug that shipped twice. An edited block
  commits its text on blur (see EditableBlock in DocPaper.tsx), so by
  the time Save's handler runs, the text is only in `pendingEdits` if
  something has already blurred that block. Clicking Save does that in
  Chrome purely by accident: Chrome focuses a <button> on mousedown, and
  moving focus blurs the block. Safari and Firefox do not focus a button
  on click at all, and neither does an activation that arrives without a
  preceding mousedown (a programmatic click, some assistive technology).
  On those paths Save read an empty set of pending edits, folded nothing,
  and dropped out of edit mode - Save behaving exactly like Cancel, with
  the user's typing gone.

  The earlier attempt at this read `pendingEdits` from a ref instead of
  from the render closure. That fixed a different, real hazard (reading a
  stale value), but not this one: when the block has not been blurred
  yet, the ref is just as empty as the state. The value had never been
  captured, so there was nothing to read from either place.

  `exitEditing` therefore blurs the block itself, first and explicitly,
  instead of hoping the browser already did. `blur()` dispatches
  focusout synchronously, so DocPaper's onBlur -> onEditBlock has run and
  the pending set is complete before `run` is called.
*/

/* the class DocPaper puts on every in-place editable block; kept as a
   constant so the one place that has to recognise such a block by sight
   is not a bare string literal sitting in an event handler */
export const EDITABLE_CLASS = "cgDoc__editable";

/* the smallest surface exitEditing needs from the focused element, so it
   can be handed a real HTMLElement in the browser and a plain object in
   a test without a DOM */
export type ActiveElementLike = {
  classList: { contains: (token: string) => boolean };
  blur: () => void;
};

/*
  Leaving edit mode by any of its three exits (Save, Cancel, or the
  toggle acting as Cancel), in the only order that cannot lose work:

  1. blur the block being edited, if one is focused, so its text is
     committed to the pending set. Synchronous, and a no-op when focus
     is anywhere else (a form field, a button, nothing at all).
  2. run the exit itself - for Save, the fold; for Cancel, the discard.
     Whichever it is, it now sees every edit the user made, including
     the one in the block they were still in.
  3. hand focus back, so it is never left on a control that is about to
     unmount with the action bar.

  Returns whether it had a block to flush, which is what makes step 1
  observable to a test.
*/
export function exitEditing(
  active: ActiveElementLike | null | undefined,
  run: () => void,
  refocus: () => void,
): boolean {
  const flushed = Boolean(active && active.classList.contains(EDITABLE_CLASS));
  if (flushed && active) active.blur();
  run();
  refocus();
  return flushed;
}
