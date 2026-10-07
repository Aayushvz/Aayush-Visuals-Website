import type { Metadata } from "next";
import TestPageClient from "@/components/test/TestPageClient";

/*
  An alternate homepage treatment, kept off to one side at /test.

  noindex is the point of the route: this is a thing to look at and judge,
  not a page that should turn up in a search for Aayush. It is excluded from
  the sitemap for the same reason.
*/
export const metadata: Metadata = {
  title: "Test - pixel",
  description: "A pixel-art homepage treatment.",
  alternates: { canonical: "/test/pixel" },
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return <TestPageClient />;
}
