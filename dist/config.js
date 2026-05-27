"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_PATH = void 0;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.configAutoInit = configAutoInit;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
require('dotenv').config();
const aiPrompt_1 = require("./aiPrompt");
const ai_1 = require("./ai");
exports.CONFIG_PATH = path_1.default.join(os_1.default.homedir(), ".commait", "config.json");
function loadConfig() {
    try {
        const raw = fs_1.default.readFileSync(exports.CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    }
    catch {
        configAutoInit();
        const raw = fs_1.default.readFileSync(exports.CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    }
}
function saveConfig(provider, model, prompt, autoCommit = false, autoPush = false, max_diff_tokens = 12000) {
    fs_1.default.mkdirSync(path_1.default.dirname(exports.CONFIG_PATH), { recursive: true });
    // Manually build the config object instead of directly stringifying input
    const configToSave = {
        provider: provider,
        model: model,
        prompt: prompt,
        auto_commit: autoCommit,
        auto_push: autoPush,
        max_diff_tokens: max_diff_tokens
    };
    const jsonString = JSON.stringify(configToSave, null, 2);
    fs_1.default.writeFileSync(exports.CONFIG_PATH, jsonString);
}
function configAutoInit() {
    let provider, model, prompt;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (anthropicKey) {
        saveConfig("anthropic", ai_1.DEFAULT_MODELS.anthropic, aiPrompt_1.commitMessagePrompt);
    }
    else if (openaiKey) {
        saveConfig("openai", ai_1.DEFAULT_MODELS.openai, aiPrompt_1.commitMessagePrompt);
    }
    else {
        saveConfig("none", "none", aiPrompt_1.commitMessagePrompt);
    }
}
