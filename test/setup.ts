import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Ensure the application uses the test database during tests
process.env.DATABASE_URL = "file:./prisma/test.db";

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/test.db",
});

const prisma = new PrismaClient({ adapter });

beforeEach(async () => {
  await prisma.rsvp.deleteMany();
  await prisma.event.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});