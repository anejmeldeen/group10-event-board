import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/test.db",
});

const prisma = new PrismaClient({ adapter });

beforeAll(async () => {
  await prisma.rsvp.deleteMany();
  await prisma.event.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});