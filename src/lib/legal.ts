// Who operates CareerMatch AI, for the Privacy Policy and Terms of Service.
// Set these in the environment so the documents name the real operator,
// Grievance Officer and courts (required by the IT Rules 2021, rule 3(2),
// the Consumer Protection (E-Commerce) Rules 2020, rule 4 and the DPDP Act).

export const LEGAL = {
  effectiveDate: "31 October 2026",
  version: "1.0",
  operator: process.env.LEGAL_OPERATOR?.trim() || "CareerMatch AI",
  address: process.env.LEGAL_ADDRESS?.trim() || "",
  email: process.env.LEGAL_EMAIL?.trim() || "",
  grievanceOfficer: process.env.GRIEVANCE_OFFICER_NAME?.trim() || "",
  grievanceEmail: process.env.GRIEVANCE_EMAIL?.trim() || process.env.LEGAL_EMAIL?.trim() || "",
  jurisdiction: process.env.LEGAL_JURISDICTION?.trim() || "",
};

/** Official texts cited by both documents. Every link was checked when written. */
export const LAWS = {
  dpdpAct: { name: "Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)", url: "https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf" },
  dpdpRules: { name: "Digital Personal Data Protection Rules, 2025 (notified 13 November 2025)", url: "https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa" },
  itAct: { name: "Information Technology Act, 2000", url: "https://www.indiacode.nic.in/bitstream/123456789/13116/1/it_act_2000_updated.pdf" },
  spdiRules: { name: "IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011", url: "https://prsindia.org/files/bills_acts/bills_parliament/2011/IT_Rules_2011.pdf" },
  intermediaryRules: { name: "IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 (as amended)", url: "https://www.meity.gov.in/static/uploads/2026/03/0b576f2071694b52e4cd6bb1b6dfab1e.pdf" },
  certIn: { name: "CERT-In Directions under section 70B(6) of the IT Act (28 April 2022)", url: "https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf" },
  cpa: { name: "Consumer Protection Act, 2019", url: "https://consumeraffairs.gov.in/public/upload/files/CP%20Act%202019_1732700731.pdf" },
  ecomRules: { name: "Consumer Protection (E-Commerce) Rules, 2020", url: "https://consumeraffairs.gov.in/pages/consumer-protection-acts" },
  contractAct: { name: "Indian Contract Act, 1872", url: "https://indiacode.gov.in/act/0e782442-f035-4d53-aace-81b1552a8cf2/details" },
} as const;
