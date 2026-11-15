import bcrypt from "bcrypt";
import { RoleName, type Prisma } from "../../generated/prisma/client";
import { prisma } from "../../shared/db";

// Loading and creating users. Everything else gets users through these functions, so the
// password hash and the role join stay in one place.

export { RoleName };

// Roles a person may pick when signing up. OFFICER and ADMIN are given by an admin.
export const SELF_ASSIGNABLE_ROLES: RoleName[] = ["SEEKER", "LANDLORD", "AGENT"];

const withRoles = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof withRoles }>;

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const findUserById = (id: string) => prisma.user.findUnique({ where: { id }, include: withRoles });
export const findUserByEmail = (email: string) => prisma.user.findUnique({ where: { email }, include: withRoles });

export async function createUser(data: {
  email: string;
  phone: string;
  password: string;
  userType: "IND" | "ORG";
  role: RoleName;
  profile: Prisma.InputJsonObject;
}) {
  const { password, role, ...fields } = data;
  return prisma.user.create({
    data: {
      ...fields,
      passwordHash: await hashPassword(password),
      roles: { create: { role: { connectOrCreate: { where: { name: role }, create: { name: role } } } } },
    },
    include: withRoles,
  });
}

export const roleNames = (user: UserWithRoles): RoleName[] => user.roles.map((r) => r.role.name);

// The user as the API returns it: no password hash, roles as a plain list.
export function toPublicUser(user: UserWithRoles) {
  const { passwordHash: _hash, roles: _roles, ...rest } = user;
  return { ...rest, roles: roleNames(user) };
}

export async function adminIds(): Promise<string[]> {
  const admins = await prisma.userRole.findMany({ where: { role: { name: "ADMIN" } }, select: { userId: true } });
  return admins.map((a) => a.userId);
}
