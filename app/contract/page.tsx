import type { Metadata } from "next";
import ContractGenerator from "@/components/contract/ContractGenerator";
import { OG_IMAGE } from "@/lib/site";

/* bare title - the root layout's template appends " - Aayush Raj" */
const description =
  "A free freelance contract generator. Fill a form, watch a full service agreement assemble live, and download it as a PDF, a Word file or Markdown. From the playground on Aayush Raj's portfolio.";

export const metadata: Metadata = {
  title: "Contract Generator Tool",
  description,
  alternates: { canonical: "/contract" },
  /* images repeated on purpose - a child openGraph replaces the parent's */
  openGraph: {
    title: "Contract Generator Tool - Aayush Raj",
    description,
    url: "/contract",
    images: [OG_IMAGE],
  },
};

export default function ContractPage() {
  return <ContractGenerator />;
}
