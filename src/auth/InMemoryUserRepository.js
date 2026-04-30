"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEMO_USERS = void 0;
exports.CreateInMemoryUserRepository = CreateInMemoryUserRepository;
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
exports.DEMO_USERS = [
    {
        id: "user-admin",
        email: "admin@app.test",
        displayName: "Avery Admin",
        role: "admin",
        passwordHash: "52bd54710a468b70e447a45d4e6cfae3:ff273e3cdedbc54045ac368d1f1955e4f6f6e177d63df6fb72440e4045cf756a6f93d16710b2542c725755d9df4960977204f4b580ce184f6242419b659973bf",
    },
    {
        id: "user-staff",
        email: "staff@app.test",
        displayName: "Sam Staff",
        role: "staff",
        passwordHash: "5e12e1f3a75b4c2300e26eaaeda137a7:32dcbbe1d8785ced8009479e0705325bc5c425f8b69cd6c4abd6298aca4468d5564cdfaf9b8a02efa330a9d7d80e885842185ca29b5415f5c7e11b1e467324f7",
    },
    {
        id: "user-reader",
        email: "user@app.test",
        displayName: "Una User",
        role: "user",
        passwordHash: "2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301",
    },
];
class InMemoryUserRepository {
    users;
    constructor(users) {
        this.users = users;
    }
    async findByEmail(email) {
        try {
            const match = this.users.find((user) => user.email === email) ?? null;
            return (0, result_1.Ok)(match);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to read the demo users."));
        }
    }
    async findById(id) {
        try {
            const match = this.users.find((user) => user.id === id) ?? null;
            return (0, result_1.Ok)(match);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to read the demo users."));
        }
    }
    async listUsers() {
        try {
            return (0, result_1.Ok)([...this.users]);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to list users."));
        }
    }
    async createUser(user) {
        try {
            this.users.push(user);
            return (0, result_1.Ok)(user);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to create the user."));
        }
    }
    async deleteUser(id) {
        try {
            const index = this.users.findIndex((user) => user.id === id);
            if (index === -1) {
                return (0, result_1.Ok)(false);
            }
            this.users.splice(index, 1);
            return (0, result_1.Ok)(true);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to delete the user."));
        }
    }
}
function CreateInMemoryUserRepository() {
    // We keep users in memory in this lecture so students can focus on auth, authorization,
    // and hashing before adding a persistent user store.
    return new InMemoryUserRepository([...exports.DEMO_USERS]);
}
