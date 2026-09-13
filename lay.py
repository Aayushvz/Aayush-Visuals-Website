import sys, pathlib
R = pathlib.Path(r"C:\Users\aayus\aayushraj-portfolio")

def edit(rel, edits):
    P = R / rel
    t = P.read_text(encoding="utf-8")
    for i, (old, new) in enumerate(edits):
        n = t.count(old)
        if n != 1:
            print("FAIL %s edit %d: %d matches for:\n%s" % (rel, i, n, old[:220])); sys.exit(1)
        t = t.replace(old, new)
    P.write_text(t, encoding="utf-8")
    print("OK %s: %d edits" % (rel, len(edits)))


edit("components/projects/projectData.ts", [
("""    A ProjectShot, so a board too tall for one WebP can be the strip it has
    to be. Meal Maestro's is 1400x22306, well past the format's 16383px
    limit, and arrived as 18 slices; Futurepreneurs' fits in one file.""",
 """    `pieces` rather than one src, because a board is delivered in parts and
    the parts are the point. WebP forces it on anything over 16383px a side
    - Meal Maestro's is 1400x22306 and Layover's 1600x22434 - but the real
    reason is loading: each piece is lazy, so a reader fetches the section
    they have scrolled to rather than twenty-two thousand pixels of case
    study to read the first screen of it. Where the cut can follow the
    board's own sections it does, so nobody ever waits on the bottom half
    of a sentence. A board that fits in one file is a one-element array."""),

("""  caseBoard?: ProjectShot;""",
 """  caseBoard?: { pieces: string[]; alt: string; caption?: string };
  /*
    The board stands in for the case study rather than joining it.

    Layover's covers the same ground as the page's own eight sections, in
    its own order and at its own pace, so running both is the argument made
    twice with the reader left to work out that they are the same argument.
    Everything between the opening statement and More Work gives way to it.
  */
  caseBoardOnly?: true;"""),

("""    caseBoard: {
      src: "/projects/futurepreneurs/board.webp",
      alt:""",
 """    caseBoard: {
      pieces: ["/projects/futurepreneurs/board.webp"],
      alt:"""),

("""    caseBoard: {
      /* The complete case study, exported at 1400x22306 and sliced into 18
         pieces — see the note on the strip shot type above for why it
         cannot ship as a single file. */
      strip: Array.from(
        { length: 18 },
        (_, i) => `/projects/meal-maestro/s${String(i).padStart(2, "0")}.webp`,
      ),
      sliceW: 1400,
      sliceH: 1240,
      lastSliceH: 1226,
      wide: true,
      caption:""",
 """    caseBoard: {
      /* 1400x22306, cut into 18 even pieces. Even rather than sectional
         because this one was sliced before the board was the unit: the
         cuts land wherever 1240px lands. Layover's follow its own frames. */
      pieces: Array.from(
        { length: 18 },
        (_, i) => `/projects/meal-maestro/s${String(i).padStart(2, "0")}.webp`,
      ),
      caption:"""),
])


P = R / "components/projects/projectData.ts"
t = P.read_text(encoding="utf-8")
i = t.index('id: "layover"')
anchor = t.index("    kind: ", i)
ins = """    /*
      Figma frame 222:6942, 1600x22434, exported as its own twelve section
      frames rather than cut out of one raster - see
      scripts/layover-board.mjs. The heights Figma reports for those frames
      sum to exactly 22434, so the pieces reassemble the board with no gap
      and no doubled row.
    */
    caseBoard: {
      pieces: [
        "00-cover",
        "01-problem",
        "02-insight",
        "03-prep-time",
        "04-traveller",
        "05-counter",
        "06-onboarding",
        "07-operator",
        "08-brand",
        "09-explorations",
        "10-reflection",
        "11-close",
      ].map((n) => `/projects/layover/board/${n}.webp`),
      caption: "The full case study, in the order it was laid out.",
      alt: "The Layover case-study board: the billboard cover, the problem of ninety minutes nobody tells you how to use, the insight that both sides are solving the same equation from opposite ends, one number across five surfaces, the traveller's app, the restaurant counter, onboarding, the operator console, the brand system, the explorations that were discarded, a reflection, and the closing mark.",
    },
    caseBoardOnly: true,
"""
t = t[:anchor] + ins + t[anchor:]
P.write_text(t, encoding="utf-8")
print("OK projectData.ts: layover board")


edit("components/projects/case/CaseBlocks.tsx", [
("""export function Board({ shot }: { shot: ProjectShot }) {
  /*
    A strip stacks with nothing between the pieces.

    Meal Maestro's board is 1400x22306, which no WebP can be - the format
    stops at 16383px a side - so it arrives as eighteen slices of one
    picture. Any gap, border or radius on a slice would draw a line across
    the middle of the artwork, which is why the corner and the clip belong
    to the strip and the slices carry neither.
  */
  const sources = shotSources(shot);
  return (
    <figure className="csFig" data-rise>
      <div className="csBoard">
        {sources.map((src, i) => {""",
 """export function Board({
  board,
}: {
  board: { pieces: string[]; alt: string; caption?: string };
}) {
  /*
    The pieces stack with nothing between them.

    A board arrives in parts - twelve for Layover, eighteen for Meal
    Maestro - and they have to read as one picture, so any gap, border or
    radius on a piece would draw a line straight across the artwork. The
    corner and the clip belong to the board; the pieces carry neither.

    Only the first piece takes the alt text. Twelve identical descriptions
    of one board is twelve times the same sentence to anyone listening to
    the page rather than looking at it.
  */
  return (
    <figure className="csFig" data-rise>
      <div className="csBoard">
        {board.pieces.map((src, i) => {"""),

("""              alt={i === 0 ? shot.alt : ""}""",
 """              alt={i === 0 ? board.alt : ""}"""),

("""      {shot.caption ? (
        <figcaption className="csFig__cap">{shot.caption}</figcaption>
      ) : null}""",
 """      {board.caption ? (
        <figcaption className="csFig__cap">{board.caption}</figcaption>
      ) : null}"""),
])


edit("components/projects/case/CaseStudyPage.tsx", [
("""                  <Board shot={project.caseBoard} />""",
 """                  <Board board={project.caseBoard} />"""),

("""            {story.details ? (
              <section className="csSec">
                <SectionHead no={++no} name="Details" />""",
 """            {/*
              Everything from here to More Work is the board's ground.

              On a project with `caseBoardOnly` the board covers the same
              material as these sections do, in its own order, so running
              both is the argument made twice at two different paces. The
              board is placed after this block in source order, which is
              what puts it directly after the opening statement once these
              are gone.
            */}
            {story.details && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="Details" />"""),

("""            {story.chapters.length
              ? story.chapters.map((chapter) => (""",
 """            {story.chapters.length && !project.caseBoardOnly
              ? story.chapters.map((chapter) => ("""),

("""            {story.highlights.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="Highlights" />""",
 """            {story.highlights.length && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="Highlights" />"""),

("""            {story.iteration.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="What I tried" />""",
 """            {story.iteration.length && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="What I tried" />"""),

("""            {story.system.length ? (
              <section className="csSec">
                <SectionHead no={++no} name="The system" />""",
 """            {story.system.length && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="The system" />"""),

("""            {story.results ? (
              <section className="csSec">
                <SectionHead no={++no} name="Results" />""",
 """            {story.results && !project.caseBoardOnly ? (
              <section className="csSec">
                <SectionHead no={++no} name="Results" />"""),

("""            {story.reflection.length ? (
              <section className="csSec csSec--invert">""",
 """            {story.reflection.length && !project.caseBoardOnly ? (
              <section className="csSec csSec--invert">"""),
])
