import type { Draft } from "./types.ts";

/*
  The form, as data.

  FormPanel renders whatever is in here and `completion` scores whatever
  is in here, so adding a field is a one line change in one place rather
  than an edit in three. `half: true` puts two fields on one row.
*/

export type Field = {
  name: keyof Draft;
  label: string;
  type: "text" | "email" | "tel" | "date" | "number" | "textarea" | "select" | "list";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  half?: boolean;
};

export type Group = { id: string; label: string; fields: Field[] };

export const DEFAULT_DRAFT: Draft = {
  designerName: "Aayush Raj",
  designerRole: "Product Designer",
  designerEmail: "aayushvisuals@gmail.com",
  designerPhone: "",
  designerAddress: "",
  designerEntity: "individual",
  designerGst: "",

  clientName: "",
  clientContact: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",

  projectName: "",
  projectDescription: "",
  deliverables: [],
  acceptanceDays: "5",

  currency: "INR",
  totalFee: "",
  advancePct: "50",
  hourlyRate: "",
  lateFeePct: "1.5",
  expenseMarkupPct: "20",

  effectiveDate: "",
  startDate: "",
  endDate: "",
  feedbackDays: "5",

  govCity: "Pune",
  govState: "Maharashtra",
  govCountry: "India",

  toggles: {
    attribution: true,
    confidentiality: true,
    warranties: true,
    termination: true,
    lateFee: true,
  },
};

export const GROUPS: Group[] = [
  {
    id: "designer",
    label: "Designer",
    fields: [
      { name: "designerName", label: "Name", type: "text", required: true, placeholder: "Your full name" },
      { name: "designerRole", label: "Role", type: "text", required: true, placeholder: "Product Designer" },
      { name: "designerEmail", label: "Email", type: "email", required: true, half: true, placeholder: "you@studio.com" },
      { name: "designerPhone", label: "Phone", type: "tel", required: true, half: true, placeholder: "+91 00000 00000" },
      { name: "designerAddress", label: "Address", type: "textarea", required: true, placeholder: "Studio, street, city, postcode" },
      {
        name: "designerEntity",
        label: "Type",
        type: "select",
        half: true,
        options: [
          { value: "individual", label: "Individual" },
          { value: "proprietor", label: "Sole Proprietor" },
          { value: "company", label: "Company" },
        ],
      },
      { name: "designerGst", label: "GST Number", type: "text", half: true, placeholder: "Optional" },
    ],
  },
  {
    id: "client",
    label: "Client",
    fields: [
      { name: "clientName", label: "Name or Company", type: "text", required: true, placeholder: "Client company" },
      { name: "clientContact", label: "Contact Person", type: "text", required: true, placeholder: "Who signs and approves" },
      { name: "clientEmail", label: "Email", type: "email", required: true, half: true, placeholder: "client@company.com" },
      { name: "clientPhone", label: "Phone", type: "tel", half: true, placeholder: "Optional" },
      { name: "clientAddress", label: "Address", type: "textarea", required: true, placeholder: "Registered address" },
    ],
  },
  {
    id: "project",
    label: "Project",
    fields: [
      { name: "projectName", label: "Project Name", type: "text", required: true, placeholder: "E-Commerce App Redesign" },
      {
        name: "projectDescription",
        label: "Description",
        type: "textarea",
        required: true,
        placeholder: "What the engagement covers, in two or three sentences.",
      },
      { name: "deliverables", label: "Deliverables", type: "list", required: true, placeholder: "Add a deliverable" },
      { name: "acceptanceDays", label: "Acceptance Window (business days)", type: "number", required: true },
    ],
  },
  {
    id: "fees",
    label: "Fees & Payment",
    fields: [
      {
        name: "currency",
        label: "Currency",
        type: "select",
        half: true,
        options: [
          { value: "INR", label: "INR" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
          { value: "GBP", label: "GBP" },
        ],
      },
      { name: "totalFee", label: "Total Project Fee", type: "number", required: true, half: true, placeholder: "150000" },
      { name: "advancePct", label: "Advance %", type: "number", required: true, half: true },
      { name: "hourlyRate", label: "Hourly Rate", type: "number", required: true, half: true, placeholder: "3000" },
      { name: "lateFeePct", label: "Late Fee % per month", type: "number", half: true },
      { name: "expenseMarkupPct", label: "Expense Markup %", type: "number", half: true },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    fields: [
      { name: "effectiveDate", label: "Effective Date", type: "date", required: true, half: true },
      { name: "feedbackDays", label: "Feedback Turnaround (days)", type: "number", required: true, half: true },
      { name: "startDate", label: "Estimated Start", type: "date", required: true, half: true },
      { name: "endDate", label: "Estimated End", type: "date", required: true, half: true },
    ],
  },
  {
    id: "jurisdiction",
    label: "Jurisdiction",
    fields: [
      { name: "govCity", label: "City", type: "text", required: true, half: true },
      { name: "govState", label: "State or Region", type: "text", half: true },
      { name: "govCountry", label: "Country", type: "text", required: true },
    ],
  },
];

const REQUIRED: (keyof Draft)[] = GROUPS.flatMap((g) =>
  g.fields.filter((f) => f.required).map((f) => f.name),
);

/* Which group a field lives in, derived from GROUPS rather than hand
   maintained: the side panel's Readiness block needs to open the right
   accordion group for a missing field, and a second, hardcoded copy of
   this mapping would drift the moment a field moves between groups. */
const FIELD_GROUP: Partial<Record<keyof Draft, string>> = Object.fromEntries(
  GROUPS.flatMap((g) => g.fields.map((f) => [f.name, g.id] as const)),
);

export function groupIdForField(name: keyof Draft): string | undefined {
  return FIELD_GROUP[name];
}

export function isFilled(value: Draft[keyof Draft]): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value != null;
}

export function completion(draft: Draft): number {
  if (REQUIRED.length === 0) return 100;
  const done = REQUIRED.filter((name) => isFilled(draft[name])).length;
  return Math.round((done / REQUIRED.length) * 100);
}
