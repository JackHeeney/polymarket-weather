import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | undefined;

export const getPrismaClient = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
};
