import type { Metadata } from "next";
import ContactPageClient from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Contact - Aayush Visuals",
  description:
    "Get in touch with Aayush Raj for product design, brand identity, UI/UX, and creative collaborations.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
