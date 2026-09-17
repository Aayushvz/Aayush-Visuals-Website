import type { Currency, EntityType } from "./types.ts";

/*
  Formatting for the document.

  Currency grouping is the detail worth getting right: INR groups the
  last three digits then twos (1,50,000), everything else groups in
  threes (150,000). `Intl` already knows this, so the locale does the
  work and there is no hand rolled grouping loop to get wrong.
*/

/*
  The locale is chosen for its GROUPING, not for its language: the contract
  is written in English throughout, so a euro amount should read 150,000 and
  1,500.50 like the rest of the document. de-DE would render those as
  150.000 and 1.500,50, which is correct German and wrong here.
*/
const LOCALE: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

const SYMBOL: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function formatMoney(amount: number, currency: Currency): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  /* whole amounts read as fees, not prices, so they lose the .00 */
  const fractionDigits = Number.isInteger(safe) ? 0 : 2;
  const body = new Intl.NumberFormat(LOCALE[currency], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safe);
  return `${SYMBOL[currency]}${body}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  /* en-GB gives "7 July 2026" rather than "July 7, 2026", the form a
     contract uses, and the form the reference uses */
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/* the Parties clause states the designer's business type in words, never
   the stored enum: schema.ts's select options are the source for the label
   text a user picks from, this is the same wording read back into the
   document */
const ENTITY_LABEL: Record<EntityType, string> = {
  individual: "Individual",
  proprietor: "Sole Proprietor",
  company: "Company",
};

export function formatEntity(entity: EntityType): string {
  return ENTITY_LABEL[entity];
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function exportFilename(projectName: string, iso: string): string {
  const stem = slugify(projectName) || "service-agreement";
  return `${stem}-${iso}`;
}
