import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

beforeAll(async () => {
  // Clear the database before each test suite runs to prevent tests from failing
  await prisma.event.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
