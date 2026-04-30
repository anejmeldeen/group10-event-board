"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePasswordHasher = CreatePasswordHasher;
const node_crypto_1 = require("node:crypto");
class ScryptPasswordHasher {
    hash(password) {
        const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
        const hash = (0, node_crypto_1.scryptSync)(password, salt, 64).toString("hex");
        return `${salt}:${hash}`;
    }
    verify(password, storedHash) {
        const [salt, expectedHash] = storedHash.split(":");
        if (!salt || !expectedHash) {
            return false;
        }
        const derivedHash = (0, node_crypto_1.scryptSync)(password, salt, 64).toString("hex");
        return (0, node_crypto_1.timingSafeEqual)(Buffer.from(derivedHash, "hex"), Buffer.from(expectedHash, "hex"));
    }
}
function CreatePasswordHasher() {
    return new ScryptPasswordHasher();
}
