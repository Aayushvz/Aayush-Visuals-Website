import type { Block, Clause, Draft } from "./types.ts";
import { formatDate, formatMoney } from "./format.ts";

/*
  The contract, as data.

  This is the only place the legal prose exists. DocPaper, render-html and
  render-md all consume the array this returns, which is what stops the
  Word export drifting from what the preview shows: there is no second
  copy to drift.

  Numbering is never written into the text. The renderers derive "01." and
  so on from position in the returned array, so switching a clause off
  renumbers the whole document for free.
*/

/* Two hyphens, deliberately not an em dash: the no-em-dash rule applies to
   the contract prose too, and clauses.test.ts asserts it by serialising the
   whole output, which would catch an em dash hiding in this constant. */
export const PLACEHOLDER = "--";

/* value-or-placeholder: the document is never allowed to show an empty gap */
function v(value: string): string {
  const t = value.trim();
  return t.length > 0 ? t : PLACEHOLDER;
}

function num(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function jurisdiction(d: Draft): string {
  return [d.govCity, d.govState, d.govCountry].map((p) => p.trim()).filter(Boolean).join(", ")
    || PLACEHOLDER;
}

export function buildClauses(d: Draft): Clause[] {
  const total = num(d.totalFee);
  const advancePct = num(d.advancePct);
  const advance = Math.round((total * advancePct) / 100);
  const balance = total - advance;
  const money = (n: number) => formatMoney(n, d.currency);

  const out: Clause[] = [];

  /* ---- 01 Parties ---------------------------------------------------- */
  const designerLines: string[] = [
    `Full Name: ${v(d.designerName)}`,
    `Address: ${v(d.designerAddress)}`,
    `Email: ${v(d.designerEmail)}`,
    `Phone: ${v(d.designerPhone)}`,
  ];
  if (d.designerGst.trim()) designerLines.push(`GST Number: ${d.designerGst.trim()}`);

  out.push({
    id: "parties",
    title: "Parties & Effective Date",
    blocks: [
      {
        kind: "para",
        text: `This Freelance Services Agreement ("Agreement") is entered into as of ${
          formatDate(d.effectiveDate) || PLACEHOLDER
        }, between:`,
      },
      { kind: "subhead", text: "Designer (Contractor)" },
      { kind: "list", items: designerLines },
      { kind: "subhead", text: "Client" },
      {
        kind: "list",
        items: [
          `Full Name / Company: ${v(d.clientName)}`,
          `Contact Person: ${v(d.clientContact)}`,
          `Address: ${v(d.clientAddress)}`,
          `Email: ${v(d.clientEmail)}`,
          `Phone: ${v(d.clientPhone)}`,
        ],
      },
      { kind: "para", text: 'Together referred to as the "Parties."' },
    ],
  });

  /* ---- 02 Scope ------------------------------------------------------ */
  out.push({
    id: "scope",
    title: "Project Scope & Deliverables",
    blocks: [
      { kind: "subhead", text: "Project Description" },
      {
        kind: "para",
        text: `The Designer agrees to provide the following services, described below and in any attached Project Brief or Statement of Work, which is incorporated into this Agreement by reference: ${v(
          d.projectDescription,
        )}`,
      },
      { kind: "subhead", text: "Deliverables" },
      {
        kind: "list",
        items: d.deliverables.filter((x) => x.trim()).length
          ? d.deliverables.filter((x) => x.trim())
          : [PLACEHOLDER],
      },
      { kind: "subhead", text: "Acceptance" },
      {
        kind: "para",
        text: `Upon delivery, the Client has ${v(
          d.acceptanceDays,
        )} business days to review each deliverable and notify the Designer in writing of any deficiencies. If no written notice is received within this period, the deliverable is deemed accepted.`,
      },
    ],
  });

  /* ---- 03 Timeline --------------------------------------------------- */
  out.push({
    id: "timeline",
    title: "Timeline & Delays",
    blocks: [
      {
        kind: "table",
        rows: [
          ["Estimated Start Date", formatDate(d.startDate) || PLACEHOLDER],
          ["Estimated End Date", formatDate(d.endDate) || PLACEHOLDER],
        ],
      },
      {
        kind: "para",
        text: "These dates are provided in good faith as working estimates and do not constitute hard contractual deadlines. The Designer's ability to meet the agreed schedule depends on the Client providing timely feedback, approvals and content as requested.",
      },
      {
        kind: "para",
        text: "Any delay caused by the Client, including late feedback, a change of direction, or deviation from the agreed process, extends the delivery timeline proportionally. Such delays do not constitute a breach of this Agreement by the Designer.",
      },
    ],
  });

  /* ---- 04 Fees ------------------------------------------------------- */
  const feeBlocks: Block[] = [
    { kind: "subhead", text: "Project Fee" },
    {
      kind: "table",
      rows: [
        ["Total Project Fee", total > 0 ? money(total) : PLACEHOLDER],
        ["Payment Currency", d.currency],
      ],
    },
    { kind: "subhead", text: "Payment Schedule" },
    {
      kind: "ledger",
      head: ["Milestone", "Amount", "Due"],
      rows: [
        [
          "Advance (non-refundable)",
          total > 0 ? `${advancePct}% of total fee (${money(advance)})` : PLACEHOLDER,
          "Before work commences",
        ],
        [
          "Final Payment",
          total > 0 ? `${100 - advancePct}% of total fee (${money(balance)})` : PLACEHOLDER,
          "Before final files are handed over",
        ],
      ],
    },
    {
      kind: "para",
      text: "No work begins until the advance payment is received. Final deliverables and source files are not released until the outstanding balance is paid in full.",
    },
  ];

  if (d.toggles.lateFee) {
    feeBlocks.push(
      { kind: "subhead", text: "Late Payments" },
      {
        kind: "para",
        text: `Invoices not settled within 14 days of the due date attract a monthly service charge of ${v(
          d.lateFeePct,
        )}% (or the maximum permitted by applicable law) on the outstanding balance. The Client is also responsible for any reasonable legal or collection costs arising from late or non-payment.`,
      },
    );
  }

  feeBlocks.push(
    { kind: "subhead", text: "Expenses & Taxes" },
    {
      kind: "para",
      text: `Any pre-approved out-of-pocket expenses incurred on behalf of the Client, such as stock imagery, third-party tools or physical prototypes, are invoiced separately with a ${v(
        d.expenseMarkupPct,
      )}% handling markup. The Client is responsible for all applicable taxes, duties or levies on the fees paid.`,
    },
  );

  out.push({ id: "fees", title: "Fees, Expenses & Payment Policy", blocks: feeBlocks });

  /* ---- 05 Revisions -------------------------------------------------- */
  out.push({
    id: "revisions",
    title: "Changes & Revisions",
    blocks: [
      { kind: "subhead", text: "Included Revisions" },
      {
        kind: "para",
        text: "The project fee includes two rounds of revisions per deliverable, within the agreed scope. Each revision round must be submitted as a consolidated set of feedback rather than in piecemeal messages.",
      },
      { kind: "subhead", text: "Additional Revisions" },
      {
        kind: "para",
        text: `Revisions beyond the included rounds, or requests that fall outside the original scope, are billed at the Designer's standard hourly rate of ${
          num(d.hourlyRate) > 0 ? `${money(num(d.hourlyRate))} per hour` : PLACEHOLDER
        }, with prior written agreement.`,
      },
      { kind: "subhead", text: "Scope Creep" },
      {
        kind: "para",
        text: "If the Client requests changes that materially alter the project scope or increase the estimated time by more than 10 percent, the Designer may submit a revised proposal. Work on expanded scope does not begin until the revised proposal is signed and the corresponding advance is received.",
      },
    ],
  });

  /* ---- 06 IP --------------------------------------------------------- */
  out.push({
    id: "ip",
    title: "Intellectual Property & Ownership",
    blocks: [
      { kind: "subhead", text: "Assignment of Final Deliverables" },
      {
        kind: "para",
        text: "Upon receipt of full payment, the Designer assigns to the Client all intellectual property rights, including copyright, in the final approved deliverables listed under Project Scope & Deliverables. The Client is the sole owner of these final design files.",
      },
      { kind: "subhead", text: "Designer's Retained Rights" },
      {
        kind: "list",
        items: [
          "All preliminary work, exploratory concepts, rejected ideas and draft iterations",
          "All proprietary tools, frameworks, code libraries, templates, design systems and methodologies used in creating the work",
          "Any creative work not explicitly listed as a final deliverable",
        ],
      },
      { kind: "subhead", text: "Condition of Transfer" },
      {
        kind: "para",
        text: "The assignment of rights takes effect only upon full payment of all invoices under this Agreement. Until that point the Designer retains all rights and the Client has no licence to use, publish or distribute the deliverables in any form.",
      },
      { kind: "subhead", text: "Third-Party Materials" },
      {
        kind: "para",
        text: "If any third-party assets such as stock imagery, typefaces or open-source code are incorporated into the deliverables, the Client is responsible for obtaining and maintaining the appropriate licences for commercial use.",
      },
    ],
  });

  /* ---- 07 Client duties ---------------------------------------------- */
  out.push({
    id: "duties",
    title: "Client Responsibilities",
    blocks: [
      { kind: "para", text: "To keep the project moving efficiently, the Client agrees to:" },
      {
        kind: "list",
        items: [
          "Provide all required content, copy, brand assets and reference materials in a timely manner",
          "Designate a single point of contact authorised to give approvals and feedback",
          "Ensure that all materials, claims and content provided do not infringe any third-party rights",
          "Proofread thoroughly before final approval. If a deliverable is approved and later found to contain errors in content the Client supplied, correction costs are charged separately",
          `Respond to feedback requests within ${v(d.feedbackDays)} business days to avoid project delays`,
        ],
      },
    ],
  });

  /* ---- 08 Attribution (optional) ------------------------------------- */
  if (d.toggles.attribution) {
    out.push({
      id: "attribution",
      title: "Attribution & Portfolio Rights",
      blocks: [
        {
          kind: "para",
          text: "The Designer retains the right to reproduce, display and publish the completed work, in whole or in part, in their portfolio, on their website, across social media channels and in design awards or competitions, once the project has been made public by the Client.",
        },
        {
          kind: "para",
          text: "The Designer may request an appropriate credit line where the work is published online. The Client is not obliged to provide this, but agrees to give the Designer reasonable notice before making the work public.",
        },
      ],
    });
  }

  /* ---- 09 Confidentiality (optional) --------------------------------- */
  if (d.toggles.confidentiality) {
    out.push({
      id: "confidentiality",
      title: "Confidentiality & Non-Solicitation",
      blocks: [
        { kind: "subhead", text: "Confidentiality" },
        {
          kind: "para",
          text: "Both Parties agree to hold each other's confidential business information, trade secrets, client data and proprietary methodologies in strict confidence. This obligation survives termination of this Agreement for a period of two years.",
        },
        { kind: "subhead", text: "Non-Solicitation" },
        {
          kind: "para",
          text: "The Client agrees not to directly recruit, solicit or hire any employee, subcontractor or collaborator of the Designer during the term of this Agreement and for six months thereafter.",
        },
      ],
    });
  }

  /* ---- 10 Warranties (optional) -------------------------------------- */
  if (d.toggles.warranties) {
    out.push({
      id: "warranties",
      title: "Warranties, Liability & Indemnification",
      blocks: [
        { kind: "subhead", text: "Designer's Warranty" },
        {
          kind: "para",
          text: "The Designer warrants that the final deliverables are original works and, to the best of their knowledge, do not infringe any third-party intellectual property rights. The Designer does not conduct formal trademark or patent clearance searches; that is the Client's responsibility.",
        },
        { kind: "subhead", text: "Limitation of Liability" },
        {
          kind: "para",
          text: "The Designer's total liability under this Agreement does not exceed the total fees paid by the Client for this project. In no event is the Designer liable for indirect, incidental or consequential damages, including lost profits, loss of business or reputational damage.",
        },
        { kind: "subhead", text: "Client Indemnification" },
        {
          kind: "list",
          items: [
            "Content, trademarks or materials provided by the Client",
            "The Client's use of the deliverables beyond the scope of this Agreement",
            "Any misrepresentation made by the Client",
          ],
        },
      ],
    });
  }

  /* ---- 11 Termination (optional) ------------------------------------- */
  if (d.toggles.termination) {
    out.push({
      id: "termination",
      title: "Termination & Suspension",
      blocks: [
        { kind: "subhead", text: "Suspension" },
        {
          kind: "para",
          text: "If the project is placed on hold by the Client for more than 30 consecutive days, the Designer may charge a suspension fee to compensate for reserved capacity, agreed in writing at the time of suspension.",
        },
        { kind: "subhead", text: "Termination by Client" },
        {
          kind: "list",
          items: [
            "All fees for work completed and approved up to the date of termination",
            "All outstanding reimbursable expenses incurred to date",
            "A kill fee of 25 percent of the remaining unpaid project fee, to compensate for lost opportunity",
          ],
        },
        { kind: "subhead", text: "Termination by Designer" },
        {
          kind: "para",
          text: "The Designer may terminate this Agreement if the Client materially breaches any term and fails to remedy the breach within 10 business days of written notice. The Client remains liable for all work completed to date. No kill fee applies in this case.",
        },
      ],
    });
  }

  /* ---- 12 General ---------------------------------------------------- */
  out.push({
    id: "general",
    title: "General Provisions",
    blocks: [
      { kind: "subhead", text: "Independent Contractor" },
      {
        kind: "para",
        text: "The Designer is an independent contractor. Nothing in this Agreement creates an employment relationship, partnership, joint venture or agency between the Parties.",
      },
      { kind: "subhead", text: "Force Majeure" },
      {
        kind: "para",
        text: "Neither Party is in breach of this Agreement for any failure or delay caused by events beyond their reasonable control, including natural disasters, government actions, pandemics or severe illness.",
      },
      { kind: "subhead", text: "Governing Law & Dispute Resolution" },
      {
        kind: "para",
        text: `This Agreement is governed by and construed in accordance with the laws of ${jurisdiction(
          d,
        )}. In the event of a dispute, the Parties agree to first attempt resolution through good-faith negotiation, followed by mediation if necessary, before pursuing arbitration or litigation.`,
      },
      { kind: "subhead", text: "Entire Agreement" },
      {
        kind: "para",
        text: "This Agreement, together with any attached Statement of Work or Project Brief, constitutes the entire agreement between the Parties and supersedes all prior discussions, representations or agreements on this subject. No amendment is valid unless made in writing and signed by both Parties. If any provision is found unenforceable, the remaining provisions continue in full force.",
      },
    ],
  });

  /* ---- 13 Signatures ------------------------------------------------- */
  out.push({
    id: "signatures",
    title: "Signatures",
    blocks: [
      {
        kind: "para",
        text: "IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.",
      },
      { kind: "signature" },
    ],
  });

  return out;
}
