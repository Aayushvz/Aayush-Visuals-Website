import type { Metadata } from "next";
import ContactPageClient from "@/components/contact/ContactPageClient";
import { OG_IMAGE } from "@/lib/site";

const description =
  "Get in touch with Aayush Raj (Aayush Visuals) for product design, brand identity, UI/UX and creative collaborations.";

export const metadata: Metadata = {
  title: "Contact",
  description,
  alternates: { canonical: "/contact" },
  /* images repeated on purpose — a child openGraph replaces the parent's */
  openGraph: {
    title: "Contact - Aayush Raj",
    description,
    url: "/contact",
    images: [OG_IMAGE],
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
