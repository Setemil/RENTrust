// The RENTrust Terms of Use and Privacy Policy, word for word from the signed-off PDFs in
// public/legal/. The legal pages and the "Terms and privacy notice" check both read from here.
//
// To publish a new version: replace the text and the PDF, raise `version` on both documents,
// and raise CONSENT_DOC_VERSION in server/features/account/consent.ts to match. Everyone then
// has to accept the new version.

export type LegalItem = {
  // The bold lead-in, such as "Account Security".
  label?: string;
  text: string;
  // A numbered list under the item.
  steps?: string[];
};

export type LegalSection = {
  number: number;
  heading: string;
  intro?: string;
  items?: LegalItem[];
  outro?: string;
};

export type LegalDocument = {
  slug: "terms" | "privacy";
  path: string;
  title: string;
  fullTitle: string;
  company: string;
  version: string;
  effective: string;
  facts: { label: string; value: string }[];
  notice: { label: string; text: string };
  sections: LegalSection[];
  closing: { title: string; lines: string[] };
  pdf: string;
};

export const terms: LegalDocument = {
  slug: "terms",
  path: "/terms",
  title: "Terms of Use",
  fullTitle: "Platform Terms of Use & User Service Agreement",
  company: "RENTrust Technology Ltd",
  version: "2.1",
  effective: "October 2026",
  facts: [{ label: "Jurisdiction", value: "Federal Republic of Nigeria" }],
  notice: {
    label: "Important notice",
    text: "BY ACCESSING, REGISTERING, OR USING THE RENTRUST PLATFORM, YOU EXPRESSLY CONSENT TO AND AGREE TO BE BOUND BY THESE TERMS OF USE. IF YOU DO NOT AGREE, DO NOT ACCESS OR USE OUR SERVICES.",
  },
  sections: [
    {
      number: 1,
      heading: "Introduction & Binding Agreement",
      intro:
        'Welcome to RENTrust Technology Ltd ("RENTrust", "Company", "We", "Us", or "Our"). These Terms of Use govern your access to and use of our digital property ecosystem, web applications, mobile platforms, and related tech infrastructure (collectively, the "Platform"). These terms constitute a legally binding agreement between RENTrust Technology Ltd and any individual or corporate entity accessing or using the Platform as a Landlord, Property Owner, Agent, Prospective Tenant, or Guest ("User", "You").',
    },
    {
      number: 2,
      heading: "Platform Identity & Scope of Services",
      intro: "RENTrust Technology Ltd operates a digital real estate marketplace and transaction facilitation engine. Our Platform enables:",
      items: [
        {
          label: "Landlords and Authorized Agents",
          text: "To list residential and commercial real estate properties for rent, manage listings, generate automated tenancy agreements, and collect rent payments.",
        },
        {
          label: "Prospective Tenants",
          text: "To discover verified property listings, inspect properties, execute standard electronic tenancy agreements, deposit caution fees into escrow, and make direct rental payments via integrated Payment Service Providers (PSPs).",
        },
        { label: "Property Management & Renewals", text: "Optional automated rent collection, lease renewal tracking, and escrow management." },
      ],
      outro:
        "RENTrust acts solely as a technology service provider and escrow/payment facilitator. RENTrust is not a licensed real estate broker, insurance underwriter, or legal representative of any party unless expressly agreed in writing.",
    },
    {
      number: 3,
      heading: "Account Registration, KYC & Verification",
      intro:
        "To access core platform features, Users must register an account and complete mandatory Know Your Customer (KYC) / Know Your Business (KYB) verification in compliance with Nigerian laws and regulatory frameworks:",
      items: [
        {
          label: "Accuracy of Information",
          text: "You agree to provide true, current, and complete details, including government-issued identification (NIN, BVN, Driver's License, or International Passport), proof of address, and corporate registration documents (CAC) for Agents and corporate Landlords.",
        },
        {
          label: "Account Security",
          text: "You are solely responsible for maintaining the confidentiality of your login credentials and for all activities conducted through your account. Promptly notify RENTrust of any unauthorized access.",
        },
        { label: "Eligibility", text: "You must be at least 18 years of age and possess full legal capacity to enter into binding contracts under Nigerian law." },
      ],
    },
    {
      number: 4,
      heading: "Property Listings, Verification & Ownership Warranty",
      intro: "Landlords and Agents listing properties on the Platform warrant that:",
      items: [
        { text: "They possess valid legal title, power of attorney, or written consent from the registered property owner to list the property for lease." },
        { text: "All listing particulars, including rental prices, location details, photographs, specifications, and service charges, are accurate, factual, and not misleading." },
        {
          text: "Properties comply with all local zoning, building, health, and safety regulations. RENTrust reserves the right to unlist or suspend any property that fails quality or ownership verification checks.",
        },
      ],
    },
    {
      number: 5,
      heading: "Commercial Model, Fees & Automated Payment Splits",
      intro: "By utilizing the Platform, Users agree to the commercial fee and payment schedule operating on RENTrust Technology Ltd platforms:",
      items: [
        {
          label: "Upfront Listing Fees (Landlords & Agents)",
          text: "Properties listed on the marketplace incur an upfront listing fee based on the rental value. Properties valued below ₦2,000,000 attract a fixed flat fee. Properties valued from ₦2,000,000 to ₦100,000,000 attract a de-escalating percentage fee, capped at ₦1,200,000. Agents enjoy discounted rates as specified in the platform fee schedule. Listings are activated only upon confirmed payment.",
        },
        {
          label: "Demand-Side Platform Usage & Legal Fee (Tenants)",
          text: "A platform usage fee of 12% is added to the advertised base rent payable by prospective tenants upon lease checkout. This fee covers digital platform usage and automated tenancy agreement generation, and is capped at ₦2,000,000.",
        },
        {
          label: "Automated PSP Split Settlement",
          text: "Tenant payments made at checkout are processed through an integrated Payment Service Provider (PSP) and automatically split into:",
          steps: ["Landlord's Bank Account (Base Rent)", "RENTrust Escrow Account (Caution Fee / Security Deposit)", "RENTrust Corporate Account (12% Usage & Legal Fee)"],
        },
        {
          label: "Optional Rent Management & Renewal Fee",
          text: "Landlords opting for automated rent management agree to annual renewal deductions: a fixed sum of ₦20,000 for rentals below ₦2,000,000, or a percentage capped at ₦700,000 for rentals between ₦2,000,000 and ₦100,000,000, deducted automatically at renewal.",
        },
      ],
    },
    {
      number: 6,
      heading: "Caution Fee Escrow Mechanics & Dispute Resolution",
      intro: "Caution fees / security deposits paid by Tenants are held safely in a designated RENTrust Escrow Account for the duration of the tenancy.",
      items: [
        {
          label: "Refund / Release Conditions",
          text: "Upon lease expiration or lawful termination, the caution deposit shall be refunded to the Tenant within ten (10) business days, subject to property inspection clearance.",
        },
        {
          label: "Damage Claims",
          text: "If a Landlord claims deductions for structural damage or unpaid utility bills, itemized proof must be submitted via the Platform within seven (7) days of lease expiration.",
        },
        {
          label: "Escrow Freeze",
          text: "In the event of a dispute over caution fee deductions, RENTrust shall freeze the funds in escrow until the dispute is resolved by mutual agreement, platform mediation, or referral to a recognised Multi-Door Courthouse.",
        },
      ],
    },
    {
      number: 7,
      heading: "Standard Tenancy Agreement Execution",
      intro:
        "When a Tenant completes payment for a property on the Platform, the parties agree that the transaction automatically triggers the execution of the RENTrust Standard Tenancy Agreement. The parties acknowledge and agree that:",
      items: [
        { text: "The Standard Tenancy Agreement generated on RENTrust Technology Platforms constitutes a legally binding and enforceable lease agreement between Landlord and Tenant under Nigerian law." },
        { text: "Electronic signatures, digital consent checkmarks, and cryptographic transaction receipts generated by RENTrust serve as legal proof of execution pursuant to the Evidence Act of Nigeria." },
        { text: "The non-variable covenants (Tenant and Landlord covenants) contained in the Standard Agreement apply automatically to all transactions on the Platform." },
      ],
    },
    {
      number: 8,
      heading: "Prohibited Activities & User Conduct",
      intro: "Users expressly agree not to engage in any of the following restricted activities on the Platform:",
      items: [
        { text: "Posting fraudulent, duplicate, or unauthorized property listings or misrepresenting property ownership." },
        { text: "Attempting to bypass or circumvent the Platform's payment gateway, fee model, or escrow engine to conduct off-platform payments for listings acquired via RENTrust." },
        { text: "Harassing, defrauding, or making misrepresentations to other platform users." },
        { text: "Reverse engineering, scraping, or launching malicious scripts against RENTrust tech infrastructure." },
      ],
      outro: "Violation of conduct rules may result in immediate account suspension, forfeiture of active listings, and legal prosecution.",
    },
    {
      number: 9,
      heading: "Intellectual Property Rights",
      intro:
        "All software, user interface designs, trademarks, logos, system algorithms, tenancy document engines, and content on RENTrust Technology Platforms are the exclusive intellectual property of RENTrust Technology Ltd. Users are granted a limited, non-exclusive, non-transferable license to access the Platform solely for intended tenancy transactions.",
    },
    {
      number: 10,
      heading: "Limitation of Liability & Disclaimers",
      intro:
        "To the maximum extent permitted by Nigerian law, RENTrust Technology Ltd, its directors, employees, and software providers shall not be liable for any indirect, incidental, consequential, or punitive damages arising from:",
      items: [
        { text: "Physical property defects, tenant-landlord disputes, structural damage, or breach of tenancy covenants by either party." },
        { text: "Interruption, downtime, or network failures experienced by integrated third-party PSP gateways or hosting providers." },
        { text: "Losses arising from unauthorized account access due to User negligence in safeguarding login credentials." },
      ],
    },
    {
      number: 11,
      heading: "Governing Law & Dispute Resolution",
      intro:
        "These Terms of Use shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any dispute, controversy, or claim arising out of or relating to these Terms or the breach thereof shall first be submitted to good-faith mediation. If unresolved within thirty (30) days, the matter shall be referred to arbitration or the relevant Multi-Door Courthouse within the applicable state jurisdiction in Nigeria.",
    },
  ],
  closing: {
    title: "User Consent & Electronic Execution Acknowledgement",
    lines: [
      'By ticking the "I Agree to the Terms of Use" checkbox during account creation or property checkout on RENTrust Technology Platforms, You acknowledge that You have read, understood, and irrevocably consented to all terms and conditions set forth herein.',
    ],
  },
  pdf: "/legal/rentrust-terms-of-use-v2.1.pdf",
};

export const privacy: LegalDocument = {
  slug: "privacy",
  path: "/privacy",
  title: "Privacy Policy",
  fullTitle: "Platform Privacy Policy & Data Protection Notice",
  company: "RENTrust Technology Ltd",
  version: "2.1",
  effective: "October 2026",
  facts: [{ label: "Compliance", value: "NDPA 2023 / NDPR" }],
  notice: {
    label: "Data consent notice",
    text: "BY REGISTERING FOR OR USING THE RENTRUST PLATFORM, YOU EXPRESSLY CONSENT TO THE COLLECTION, PROCESSING, SHARING, AND RETENTION OF YOUR PERSONAL DATA AS DESCRIBED IN THIS PRIVACY POLICY.",
  },
  sections: [
    {
      number: 1,
      heading: "Introduction & Statutory Compliance",
      intro:
        'RENTrust Technology Ltd ("RENTrust", "We", "Us", or "Our") is committed to protecting the privacy and personal data of all users ("You", "Data Subject"), including Landlords, Property Agents, Tenants, and Visitors. This Privacy Policy sets out how we collect, use, process, store, and safeguard your personal information in accordance with the Nigeria Data Protection Act 2023 (NDPA), the Nigeria Data Protection Regulation (NDPR), and other applicable legal frameworks governing data privacy.',
    },
    {
      number: 2,
      heading: "Information We Collect",
      intro: "To provide seamless real estate listing, tenancy execution, and escrow payment management, RENTrust collects several types of personal and organizational data:",
      items: [
        {
          label: "Identity & KYC Data",
          text: "Full name, residential address, email address, telephone number, date of birth, government-issued identification numbers (NIN, BVN, Driver's License, International Passport), and clear biometric or facial photo verification images.",
        },
        {
          label: "Corporate & Licensing Data",
          text: "Business registration numbers (CAC), tax identification numbers, and property management agency licenses for corporate Landlords and Agents.",
        },
        {
          label: "Financial & Transaction Data",
          text: "Bank Account Numbers, NUBAN details, debit card transaction logs, billing addresses, rental payment histories, escrow caution fee ledger entries, and automated revenue-split receipts.",
        },
        {
          label: "Property & Lease Data",
          text: "Property ownership deeds, title documents, physical site coordinates, interior photos, lease terms, rent payment schedules, and signed tenancy contracts.",
        },
        {
          label: "Technical & Usage Data",
          text: "IP addresses, browser types, device identifiers, login credentials, page interaction data, and geolocation data collected via cookies and analytics scripts.",
        },
      ],
    },
    {
      number: 3,
      heading: "Legal Basis for Data Processing",
      intro: "RENTrust processes your personal data only when permitted under applicable law, specifically based on:",
      items: [
        { label: "Consent", text: "Explicit approval granted when accepting this Policy or completing digital KYC verification." },
        {
          label: "Contractual Performance",
          text: "Necessity to execute the RENTrust Terms of Use, facilitate rental agreements, split payments, and administer escrow caution deposits.",
        },
        {
          label: "Legal Obligation",
          text: "Compliance with anti-money laundering (AML), counter-terrorism financing (CFT), tax reporting, and statutory regulatory directives.",
        },
        { label: "Legitimate Interest", text: "Fraud prevention, risk management, platform security maintenance, and dispute resolution." },
      ],
    },
    {
      number: 4,
      heading: "How We Use Your Personal Data",
      intro: "RENTrust utilizes collected personal information strictly for legitimate real estate operations, including:",
      items: [
        {
          label: "User Identification & Onboarding",
          text: "Verifying user identity, conducting background checks, and validating property ownership or agency rights.",
        },
        {
          label: "Transaction Facilitation",
          text: "Generating standardized digital tenancy agreements, enabling automated rent splitting between parties, and processing security deposits via secure Payment Service Providers (PSPs).",
        },
        { label: "Escrow Administration", text: "Managing caution fee holds, processing refund requests, and assessing property damage claims." },
        {
          label: "Communication & Support",
          text: "Sending payment receipts, renewal alerts, account security notices, customer support messages, and legal updates.",
        },
        {
          label: "Platform Security & Optimization",
          text: "Monitoring system performance, detecting fraudulent activity, preventing double-listings, and maintaining system integrity.",
        },
      ],
    },
    {
      number: 5,
      heading: "Data Sharing & Third-Party Disclosures",
      intro: "RENTrust does not sell, rent, or trade your personal data to third-party marketers. We share your information only under controlled, secure circumstances with:",
      items: [
        {
          label: "Counterparties to Lease Transactions",
          text: "Necessary identity and contact details are shared between Landlords and Tenants upon successful lease agreement execution.",
        },
        {
          label: "Licensed Payment Service Providers (PSPs) & Financial Partners",
          text: "Transactional data, NUBAN details, and payment instructions are securely passed to CBN-licensed financial service providers to execute automated rent splitting and escrow management.",
        },
        {
          label: "Identity Verification Partners",
          text: "Verified identity credentials (NIN, BVN) are processed through licensed credit bureaus and identity verification APIs solely for mandatory KYC verification.",
        },
        {
          label: "Law Enforcement & Regulatory Authorities",
          text: "Data may be disclosed when required by law, court order, or formal request from statutory bodies (e.g., NDPC, EFCC, NIBSS, or law enforcement agencies).",
        },
      ],
    },
    {
      number: 6,
      heading: "Data Security & Storage Architecture",
      intro:
        "RENTrust implements robust administrative, technical, and physical security measures designed to protect personal data against unauthorized access, loss, alteration, or disclosure:",
      items: [
        {
          label: "Encryption Standards",
          text: "Data in transit is protected using Transport Layer Security (TLS 1.3/SSL), and sensitive data at rest is encrypted using AES-256 standards.",
        },
        {
          label: "Access Control",
          text: "Strict role-based access control (RBAC) and multi-factor authentication (MFA) restrict internal access to authorized personnel only.",
        },
        {
          label: "Data Localization & Transfers",
          text: "Personal data is stored on secure cloud servers complying with NDPA standards. Any international data transfer relies on adequate cross-border transfer safeguards approved by data protection authorities.",
        },
      ],
    },
    {
      number: 7,
      heading: "Data Subject Rights (NDPA Framework)",
      intro: "Under the Nigeria Data Protection Act (NDPA), you possess specific legal rights regarding your personal information:",
      items: [
        { label: "Right of Access", text: "You may request copies of personal data held by RENTrust." },
        { label: "Right to Rectification", text: "You may request correction of inaccurate, incomplete, or outdated information." },
        {
          label: 'Right to Erasure ("Right to be Forgotten")',
          text: "You may request deletion of your data, provided retention is not required for statutory, tax, legal, or ongoing escrow obligations.",
        },
        { label: "Right to Object & Restrict Processing", text: "You have the right to object to automated processing or request limits on how your data is used." },
        { label: "Right to Data Portability", text: "You may request your personal data in a structured, standard, machine-readable format." },
        {
          label: "Right to Withdraw Consent",
          text: "You may withdraw your consent for data processing at any time without affecting the lawfulness of processing conducted prior to withdrawal.",
        },
      ],
    },
    {
      number: 8,
      heading: "Data Retention Policy",
      intro:
        "RENTrust retains personal data only for as long as necessary to fulfill the purposes for which it was collected, including active account management, tenancy lease cycles, caution fee escrows, tax reporting, and dispute settlement. Upon account termination, personal data is archived or securely anonymized in accordance with statutory retention timelines mandated by Nigerian law.",
    },
    {
      number: 9,
      heading: "Cookies & Tracking Technologies",
      intro:
        "The Platform uses operational and analytical cookies to remember user sessions, enhance navigation, and analyze platform traffic. You can manage or disable non-essential cookies through your browser settings, though certain platform functionalities may be limited as a result.",
    },
    {
      number: 10,
      heading: "Policy Updates & Contact Details",
      intro:
        "RENTrust Technology Ltd reserves the right to update this Privacy Policy periodically to reflect legal or technological changes. Material changes will be communicated via platform notifications or registered email addresses.",
    },
  ],
  closing: {
    title: "Data Protection Officer (DPO) Contact Information",
    lines: [
      "For questions, data access requests, or privacy complaints under the NDPA, please contact our Data Protection Office at:",
      "RENTrust Technology Ltd — Data Protection Office",
      "Email: privacy@rentrust.ng | dpo@rentrust.ng",
      "Address: Corporate Secretariat, RENTrust Technology Ltd, Victoria Island, Lagos, Nigeria.",
    ],
  },
  pdf: "/legal/rentrust-privacy-policy-v2.1.pdf",
};

export const legalDocuments = [terms, privacy];
