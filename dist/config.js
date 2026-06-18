"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_PATH = exports.CONFIG_OPTIONS = void 0;
exports.loadConfig = loadConfig;
exports.configSet = configSet;
exports.saveConfig = saveConfig;
exports.configAutoInit = configAutoInit;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
require('dotenv').config();
const aiPrompt_1 = require("./aiPrompt");
const ai_1 = require("./ai");
const errors_1 = require("./errors");
exports.CONFIG_OPTIONS = {
    provider: {
        description: "AI provider to use",
        options: ["openai", "anthropic"],
    },
    model: {
        description: "Model to use for the selected provider",
        options: ["Based on Provider"],
    },
    prompt: {
        description: "Custom prompt for commit message generation",
        options: null,
    },
    auto_stage: {
        description: "Automatically stage all files before commit",
        options: [
            { name: "Enabled", value: true },
            { name: "Disabled", value: false }
        ]
    },
    auto_commit: {
        description: "Commit without confirmation",
        options: [true, false],
    },
    auto_push: {
        description: "Push without confirmation",
        options: [
            { name: "Enabled", value: true },
            { name: "Disabled", value: false }
        ]
    },
    max_diff_tokens: {
        description: "Max tokens per diff before truncation",
        options: ["Number Representing Max Tokens"],
    },
    default_origin: {
        description: "Default remote to push to",
        options: ["Different based on your enviroment"],
    },
    ask_origin: {
        description: "Ask which remote to push to every time",
        options: [
            { name: "Enabled", value: true },
            { name: "Disabled", value: false }
        ]
    },
};
exports.CONFIG_PATH = path_1.default.join(os_1.default.homedir(), ".commait", "config.json");
/* ---------------------------------------------------------------
 | loadConfig — loads config and saves as obj
 | args: none
 | returns: {}
 --------------------------------------------------------------- */
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
/* ---------------------------------------------------------------
 | configSet — rewrites a speiifc congif key given key an value
 | args: key(string), value(string)
 | returns: none
 --------------------------------------------------------------- */
function configSet(key, value) {
    const config = loadConfig();
    if (!(key in config))
        throw new errors_1.ConfigError(`${key} is not a valid config option. Use "commait config option" to get full list`);
    config[key] = value;
    const jsonString = JSON.stringify(config, null, 2);
    fs_1.default.writeFileSync(exports.CONFIG_PATH, jsonString);
}
/* ---------------------------------------------------------------
 | saveConfig — given arg for all config keys, saves new config
 |              file.
 | args: provider(string) model(string) prompt(string) autoCommit(boolean)
 |       autoPush(boolean) max_diff_tokens(number) defOrigin(string)
 |       askOrigin(boolean)
 | returns: none
 --------------------------------------------------------------- */
function saveConfig(provider, model, prompt, autoStage = false, autoCommit = false, autoPush = false, max_diff_tokens = 12000, defOrigin = "origin", askOrigin = false) {
    fs_1.default.mkdirSync(path_1.default.dirname(exports.CONFIG_PATH), { recursive: true });
    // Manually build the config object instead of directly stringifying input
    const configToSave = {
        provider: provider,
        model: model,
        prompt: prompt,
        auto_stage: autoStage,
        auto_commit: autoCommit,
        auto_push: autoPush,
        max_diff_tokens: max_diff_tokens,
        default_origin: defOrigin,
        ask_origin: askOrigin
    };
    const jsonString = JSON.stringify(configToSave, null, 2);
    fs_1.default.writeFileSync(exports.CONFIG_PATH, jsonString);
}
/* ---------------------------------------------------------------
 | configAutoInit — create new config file with default settings
 | args: none
 | returns: none
 --------------------------------------------------------------- */
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
