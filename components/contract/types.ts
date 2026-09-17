/*
  The vocabulary the whole tool shares.

  `Draft` is the form. `Clause` and `Block` are the document. Keeping them
  in one file that imports nothing means the three renderers, the schema
  and the state hook all agree on the same shapes without a cycle.
*/

export type Currency = "INR" | "USD" | "EUR" | "GBP";

export type EntityType = "individual" | "proprietor" | "company";

/* The five switches that change what the document contains. Four remove a
   whole numbered clause; `lateFee` suppresses a sub clause inside 04 and
   so triggers no renumbering. */
/* The three curated contract skins. It lives here rather than in
   ContractGenerator.tsx so Toolbar does not have to import from its own
   parent, which would be a (type-only, but avoidable) import cycle. */
export type Skin = "studio" | "editorial" | "plain";

export type Toggles = {
  attribution: boolean;
  confidentiality: boolean;
  warranties: boolean;
  termination: boolean;
  lateFee: boolean;
};

export type Draft = {
  /* designer */
  designerName: string;
  designerRole: string;
  designerEmail: string;
  designerPhone: string;
  designerAddress: string;
  designerEntity: EntityType;
  designerGst: string;

  /* client */
  clientName: string;
  clientContact: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;

  /* project */
  projectName: string;
  projectDescription: string;
  deliverables: string[];
  acceptanceDays: string;

  /* fees */
  currency: Currency;
  totalFee: string;
  advancePct: string;
  hourlyRate: string;
  lateFeePct: string;
  expenseMarkupPct: string;

  /* timeline */
  effectiveDate: string;
  startDate: string;
  endDate: string;
  feedbackDays: string;

  /* jurisdiction */
  govCity: string;
  govState: string;
  govCountry: string;

  toggles: Toggles;
};

export type Block =
  | { kind: "para"; text: string }
  | { kind: "subhead"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; rows: [string, string][] }
  | { kind: "ledger"; head: [string, string, string]; rows: [string, string, string][] }
  | { kind: "signature" };

export type Clause = {
  id: string;
  title: string;
  blocks: Block[];
};
