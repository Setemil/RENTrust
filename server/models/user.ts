import bcrypt from "bcrypt";
import { prisma } from "../config/db";
import { RoleName, type Prisma } from "../generated/prisma/client";

export { RoleName };

// Roles a user may pick when self-registering. OFFICER/ADMIN are assigned by an admin.
export const SELF_ASSIGNABLE_ROLES: RoleName[] = [
  RoleName.SEEKER,
  RoleName.LANDLORD,
  RoleName.AGENT,
];

const SALT_ROUNDS = 12;

const withRoles = { roles: { include: { role: true } } } satisfies Prisma.UserInclude;

export type UserWithRoles = Prisma.UserGetPayload<{ include: typeof withRoles }>;

export type PublicUser = Omit<UserWithRoles, "passwordHash" | "roles"> & { roles: RoleName[] };

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id }, include: withRoles });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, include: withRoles });
}

export async function createUser(data: {
  email: string;
  phone: string;
  password: string;
  userType: "IND" | "ORG";
  role: RoleName;
  profile: Prisma.InputJsonObject;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      passwordHash: await hashPassword(data.password),
      userType: data.userType,
      profile: data.profile,
      roles: {
        create: {
          role: { connectOrCreate: { where: { name: data.role }, create: { name: data.role } } },
        },
      },
    },
    include: withRoles,
  });
}

export function roleNames(user: UserWithRoles): RoleName[] {
  return user.roles.map((userRole) => userRole.role.name);
}

// Strips the password hash and flattens roles for API responses.
export function toPublicUser(user: UserWithRoles): PublicUser {
  const { passwordHash: _passwordHash, roles: _roles, ...rest } = user;
  return { ...rest, roles: roleNames(user) };
}
