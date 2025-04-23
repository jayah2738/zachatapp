import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'socketTimeoutMS=30000&connectTimeoutMS=30000&maxPoolSize=20&minPoolSize=5'
      },
    },
    log: ['warn', 'error']
  });

  // Add connection health check
  prisma.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      console.error('Prisma error:', error);
      // Attempt to reconnect if connection lost
      await prisma.$disconnect();
      await prisma.$connect();
      return await next(params);
    }
  });

  return prisma;
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Verify connection on startup
prisma.$connect()
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
