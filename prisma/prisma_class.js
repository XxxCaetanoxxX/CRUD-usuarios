import { PrismaClient } from '@prisma/client';

// Cria uma única instância do Prisma
export const prisma = new PrismaClient({
    log: ['query'], //mostrar debugs
});