"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
// Ensure the application uses the test database during tests
process.env.DATABASE_URL = "file:./prisma/test.db";
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({
    url: "file:./prisma/test.db",
});
const prisma = new client_1.PrismaClient({ adapter });
beforeEach(async () => {
    await prisma.rsvp.deleteMany();
    await prisma.event.deleteMany();
});
afterAll(async () => {
    await prisma.$disconnect();
});
