"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePrismaSavedRepository = CreatePrismaSavedRepository;
const result_1 = require("../lib/result");
function toSavedEventRecord(record) {
    return {
        id: record.id,
        userId: record.userId,
        eventId: record.eventId,
        createdAt: record.createdAt,
    };
}
class PrismaSavedRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByUserAndEvent(userId, eventId) {
        try {
            const record = await this.prisma.savedEvent.findFirst({
                where: {
                    userId,
                    eventId,
                },
            });
            return (0, result_1.Ok)(record ? toSavedEventRecord(record) : null);
        }
        catch (e) {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: `Unable to read saved events: ${e?.message ?? String(e)}`,
            });
        }
    }
    async listByUser(userId) {
        try {
            const records = await this.prisma.savedEvent.findMany({
                where: { userId },
                orderBy: { createdAt: "asc" },
            });
            return (0, result_1.Ok)(records.map(toSavedEventRecord));
        }
        catch (e) {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: `Unable to list saved events: ${e?.message ?? String(e)}`,
            });
        }
    }
    async create(record) {
        try {
            const created = await this.prisma.savedEvent.create({
                data: {
                    id: record.id,
                    userId: record.userId,
                    eventId: record.eventId,
                    createdAt: record.createdAt,
                },
            });
            return (0, result_1.Ok)(toSavedEventRecord(created));
        }
        catch (e) {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: `Unable to save this event: ${e?.message ?? String(e)}`,
            });
        }
    }
    async remove(userId, eventId) {
        try {
            await this.prisma.savedEvent.deleteMany({
                where: {
                    userId,
                    eventId,
                },
            });
            return (0, result_1.Ok)(undefined);
        }
        catch (e) {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: `Unable to remove saved event: ${e?.message ?? String(e)}`,
            });
        }
    }
}
function CreatePrismaSavedRepository(prisma) {
    return new PrismaSavedRepository(prisma);
}
