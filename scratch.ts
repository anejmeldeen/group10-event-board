import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

const adapter = new PrismaBetterSqlite3(new Database("./dev.db"));
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const e = await prisma.event.create({
      data: {
        id: "test-id-1",
        title: "Test",
        description: "Test description",
        location: "Test loc",
        category: "Test cat",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        organizerId: "org-1",
        organizerName: "Org 1",
        status: "draft",
        capacity: 0,
        attendeeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
    console.log("Success:", e);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
