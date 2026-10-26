export const listingRef = (ref: number) => `RT-${String(ref).padStart(4, "0")}`;

export function personName(user: { userType: string; profile: unknown; email: string }) {
  const profile = (user.profile ?? {}) as { firstName?: string; lastName?: string; orgName?: string };
  if (user.userType === "ORG" && profile.orgName) return profile.orgName;
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || user.email;
}
