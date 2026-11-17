import { test } from "node:test";
import assert from "node:assert/strict";
import { descentCards, type ExperimentSource } from "./cards.ts";
import { ACTS } from "./path.ts";

const act = (id: string) => ACTS.find((a) => a.id === id)!;

/*
  A stand-in for components/playground/experiments.ts.

  That file cannot be imported here: it pulls in ./covers, a .tsx module
  full of JSX, and node's test runner strips types but does not transform
  JSX. So descentCards takes its source as an argument — the page passes
  the real EXPERIMENTS and TypeScript checks the shape at that call site.
*/
const FIXTURE: ExperimentSource[] = [
  { id: "dpl", title: "DPL", kind: "Browser game", href: "/dpl", blurb: "A cricket game in a tab." },
  { id: "cat", title: "Cat Operator", kind: "Interface toy", href: "/cat", blurb: "A cat that runs your cursor." },
  { id: "pond", title: "Pond", kind: "Canvas sketch", href: "/pond", blurb: "Ripples that answer the mouse." },
  { id: "invoice", title: "Invoice", kind: "Tool", href: "/invoice", blurb: "Invoices without the spreadsheet." },
  { id: "contract", title: "Contract", kind: "Tool", href: "/contract", blurb: "Contracts a designer can read." },
];

test("there are 8 cards: 5 experiments and 3 projects", () => {
  const cards = descentCards(FIXTURE);
  assert.equal(cards.length, 8);
  assert.equal(cards.filter((c) => c.act === "chasm").length, 3);
  assert.equal(cards.filter((c) => c.act === "forge").length, 5);
});

test("every card carries the fields the overlay needs", () => {
  for (const c of descentCards(FIXTURE)) {
    assert.ok(c.id, "missing id");
    assert.ok(c.title, `${c.id}: missing title`);
    assert.ok(c.href, `${c.id}: missing href`);
    assert.ok(c.kind, `${c.id}: missing kind`);
    assert.ok(c.blurb, `${c.id}: missing blurb`);
  }
});

test("ids are unique", () => {
  const ids = descentCards(FIXTURE).map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("stops run strictly forward down the journey", () => {
  const stops = descentCards(FIXTURE).map((c) => c.stop);
  for (let i = 1; i < stops.length; i++) {
    assert.ok(stops[i] > stops[i - 1], `stop ${i} (${stops[i]}) not after ${stops[i - 1]}`);
  }
});

test("every stop sits inside its own act, clear of the boundaries", () => {
  for (const c of descentCards(FIXTURE)) {
    const a = act(c.act);
    assert.ok(c.stop > a.from, `${c.id} at ${c.stop} is before ${c.act} opens`);
    assert.ok(c.stop < a.to, `${c.id} at ${c.stop} is after ${c.act} ends`);
  }
});

test("no card lands in the finale — the finale is where they all reassemble", () => {
  for (const c of descentCards(FIXTURE)) {
    assert.ok(c.stop < act("finale").from, `${c.id} strays into the finale`);
  }
});

test("the list is stable across calls", () => {
  assert.deepEqual(descentCards(FIXTURE), descentCards(FIXTURE));
});

test("artwork paths point into /playground, where the assets actually live", () => {
  for (const c of descentCards(FIXTURE)) {
    if (c.poster) assert.match(c.poster, /^\/playground\//, `${c.id} poster: ${c.poster}`);
    if (c.video) assert.match(c.video, /^\/playground\//, `${c.id} video: ${c.video}`);
  }
});

/* the overlay shows the poster until the camera is nearest, then swaps in
   the loop — a video with no poster frame would pop in from nothing */
test("every card with a video also has a poster to sit under it", () => {
  for (const c of descentCards(FIXTURE)) {
    if (c.video) assert.ok(c.poster, `${c.id} has a video but no poster`);
  }
});

test("seven of the eight cards carry artwork", () => {
  const withArt = descentCards(FIXTURE).filter((c) => c.poster);
  assert.equal(withArt.length, 7);
  const without = descentCards(FIXTURE).find((c) => !c.poster);
  assert.equal(without?.id, "cat", "the only card without art should be cat");
});

test("a renamed or removed experiment fails loudly instead of vanishing", () => {
  const short = FIXTURE.filter((e) => e.id !== "pond");
  assert.throws(() => descentCards(short), /pond/);
});
