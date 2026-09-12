import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Cursor from "@/components/Cursor";
import ErrorScene from "@/components/error/ErrorScene";

/*
  Any address the site does not have.

  The nav comes with it. A 404 is a dead end, and the page's own three
  buttons are the deliberate way out, but somebody who landed here from a
  stale link on someone else's site has no history to go back through and
  should still be able to reach everything from where they are standing.
*/
export default function NotFound() {
  return (
    <>
      <Navbar />
      <MobileNav />
      <Cursor />
      <ErrorScene kind="not-found" />
    </>
  );
}
