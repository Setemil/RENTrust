import type { RoleName, User } from "./api";

export const roleLabels: Record<RoleName, string> = {
  SEEKER: "Renter",
  LANDLORD: "Landlord",
  AGENT: "Agent or property manager",
  OFFICER: "RENTrust officer",
  ADMIN: "RENTrust admin",
};

export function displayName(user: User) {
  const { firstName, lastName, orgName } = user.profile;
  if (user.userType === "ORG" && orgName) return orgName;
  return [firstName, lastName].filter(Boolean).join(" ") || user.email;
}

export function greetingName(user: User) {
  if (user.userType === "ORG") return user.profile.orgName ?? "there";
  return user.profile.firstName ?? "there";
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}
