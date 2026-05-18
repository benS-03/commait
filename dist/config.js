"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_PATH = void 0;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
exports.CONFIG_PATH = path_1.default.join(os_1.default.homedir(), ".commait", "config.json");
function loadConfig() {
    try {
        const raw = fs_1.default.readFileSync(exports.CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function saveConfig(config) {
    fs_1.default.mkdirSync(path_1.default.dirname(exports.CONFIG_PATH), { recursive: true });
    fs_1.default.writeFileSync(exports.CONFIG_PATH, JSON.stringify(config, null, 2));
}
