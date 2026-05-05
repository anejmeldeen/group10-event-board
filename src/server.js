"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpServer = void 0;
require("dotenv/config");
const node_fs_1 = __importDefault(require("node:fs"));
const node_http_1 = __importDefault(require("node:http"));
const node_https_1 = __importDefault(require("node:https"));
const node_path_1 = __importDefault(require("node:path"));
const composition_1 = require("./composition");
class HttpServer {
    app;
    constructor(app) {
        this.app = app;
    }
    start(port) {
        const expressApp = this.app.getExpressApp();
        const httpsPort = Number(process.env.HTTPS_PORT ?? port);
        const redirectPort = Number(process.env.HTTP_REDIRECT_PORT ?? 3000);
        const keyPath = process.env.HTTPS_KEY_PATH ?? node_path_1.default.join(process.cwd(), "certs/localhost-key.pem");
        const certPath = process.env.HTTPS_CERT_PATH ?? node_path_1.default.join(process.cwd(), "certs/localhost-cert.pem");
        const key = node_fs_1.default.readFileSync(keyPath);
        const cert = node_fs_1.default.readFileSync(certPath);
        node_https_1.default.createServer({ key, cert }, expressApp).listen(httpsPort, () => {
            // eslint-disable-next-line no-console
            console.log(`App running on https://localhost:${httpsPort}`);
        });
        if (redirectPort !== httpsPort) {
            node_http_1.default
                .createServer((req, res) => {
                const location = `https://localhost:${httpsPort}${req.url ?? "/"}`;
                res.writeHead(301, { Location: location });
                res.end();
            })
                .listen(redirectPort, () => {
                // eslint-disable-next-line no-console
                console.log(`Redirecting http://localhost:${redirectPort} -> https://localhost:${httpsPort}`);
            });
        }
    }
}
exports.HttpServer = HttpServer;
const port = Number(process.env.HTTPS_PORT ?? process.env.PORT ?? 3443);
const app = (0, composition_1.createComposedApp)();
const server = new HttpServer(app);
server.start(port);
