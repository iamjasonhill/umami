import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export async function createSession(
  data: Prisma.SessionUncheckedCreateInput,
  options = { skipDuplicates: false },
) {
  try {
    return await prisma.client.session.create({
      data,
    });
  } catch (e: any) {
    // With skipDuplicates flag: ignore unique constraint error and return null
    if (
      options.skipDuplicates &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return null;
    }
    throw e;
  }
}
