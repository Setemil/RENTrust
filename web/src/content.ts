export const CONTACT_EMAIL = "hello@rentrust.ng";
export const WAITLIST_ID = "waitlist";

export const cities = ["Lagos", "Abuja"] as const;

export const roles = [
  { value: "renter", label: "Renter" },
  { value: "landlord", label: "Landlord or agent" },
] as const;

export const nav = [
  { href: "#checks", label: "How we check" },
  { href: "#steps", label: "How renting works" },
  { href: "#landlords", label: "For landlords" },
];

export const hero = {
  title: "Rent a home that's been checked.",
  slogan: "From search to keys in one single trusted process.",
  body: "RENTrust is a rental marketplace for everyone that manages the whole rental ecosystem, from property search to rent management. Every renter, landlord and property is verified first.",
};

export const checks = {
  title: "Three separate checks before anyone pays",
  body: "A listing only counts as verified where all three checks overlap.",
  items: [
    { key: "A", title: "You", body: "A quick ID check, or a business check for companies, unlocks the listings." },
    { key: "B", title: "The landlord or agent", body: "Identity confirmed, plus proof they own the property or are allowed to let it." },
    { key: "C", title: "The property", body: "Documents reviewed and the listing checked by our team before it goes live." },
  ],
};

export const steps = {
  title: "From first search to every rent day",
  items: [
    { title: "Find a verified home", body: "Browse houses, short-lets and offices from checked landlords.", unlocks: "Unlocks showing interest" },
    { title: "Show interest", body: "Accept the landlord's terms. They review your profile and approve or decline.", unlocks: "Unlocks an inspection" },
    { title: "Inspect with an officer", body: "Pick a time. A RENTrust officer meets you there and files a report.", unlocks: "Unlocks the agreement" },
    { title: "Sign and pay", body: "Sign a lawyer-reviewed agreement and pay through a licensed provider.", unlocks: "Unlocks your tenancy" },
    { title: "Live and pay rent", body: "Rent reminders, receipts and renewals stay in one place for the whole tenancy.", unlocks: "Through every renewal" },
  ],
};

export const landlords = {
  title: "For landlords and agents",
  body: "List once you're verified, hear only from verified renters, and let us manage the tenancy after they move in.",
  items: [
    { title: "Assessed applicants", body: "Review a report on each interested renter, then approve or decline." },
    { title: "Fewer wasted viewings", body: "Inspections happen only after you approve, with our officer present." },
    { title: "Rent on schedule", body: "Reminders, receipts and a payment ledger, handled for you." },
    { title: "Help if rent is late", body: "Offer a payment plan, or pass the case to a qualified lawyer." },
  ],
};

export const closing = {
  title: "Be first in when we open",
  body: "We're launching in Lagos and Abuja. Join the waitlist and we'll email you when you can sign up.",
  fields: [
    { label: "For", value: "Renters, landlords and agents" },
    { label: "Location", value: "Lagos and Abuja" },
    { label: "Status", value: "Opening soon" },
    { label: "Prepared by", value: "RENTrust Nigeria Limited" },
  ],
};
