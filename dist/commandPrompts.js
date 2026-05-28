"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configInitPrompt = configInitPrompt;
exports.confirmCommit = confirmCommit;
exports.confirmContinue = confirmContinue;
exports.typePrompt = typePrompt;
exports.remotePrompt = remotePrompt;
exports.configKeysPrompt = configKeysPrompt;
exports.configValuePrompt = configValuePrompt;
exports.ynListPrompt = ynListPrompt;
const inquirer_1 = __importDefault(require("inquirer"));
const ai_1 = require("./ai");
const config_1 = require("./config");
const git_1 = require("./git");
const aiPrompt_1 = require("./aiPrompt");
async function configInitPrompt() {
    const remotes = (0, git_1.getRemotes)();
    const answers = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "provider",
            message: "Choose your AI provider:",
            choices: ["openai", "anthropic"],
        },
        {
            type: "list",
            name: "openaiModel",
            message: "Choose OpenAI model:",
            choices: ai_1.MODEL_REGISTRY.openai,
            when: (ans) => ans.provider === "openai",
        },
        {
            type: "list",
            name: "anthropicModel",
            message: "Choose Anthropic model:",
            choices: ai_1.MODEL_REGISTRY.anthropic,
            when: (ans) => ans.provider === "anthropic",
        },
        {
            type: "input",
            name: "prompt",
            message: "Type a custom prompt here, leave blank for default."
        },
        {
            type: "number",
            name: "maxTokens",
            message: "Enter max tokens per diff: ",
            validate: (value) => {
                if (!Number.isInteger(value) || value <= 0)
                    return "Enter a positive integer";
                return true;
            }
        },
        {
            type: "list",
            name: "autoCommit",
            message: "Commit without confirmation?",
            choices: [
                { name: "Auto Commit Enabled", value: true },
                { name: "Auto Commit Disabled", value: false }
            ]
        },
        {
            type: "list",
            name: "autoPush",
            message: "Push without confirmation?",
            choices: [
                { name: "Auto Push Enabled", value: true },
                { name: "Auto Push Disabled", value: false }
            ]
        },
        {
            type: "list",
            name: "askRemote",
            message: "Ask for remote on every push?",
            choices: [
                { name: "Ask for remote on every push", value: true },
                { name: "Do not ask", value: false }
            ]
        },
        {
            type: "list",
            name: "defRemote",
            message: "Select default remote to push to: ",
            choices: remotes
        }
    ]);
    return answers;
}
async function confirmCommit() {
    const answer = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'commitConfirm',
            message: 'Use this commit?',
            choices: [
                { name: 'Yes', value: 'y' },
                { name: 'No', value: 'n' },
                { name: 'Regenerate', value: 'r' },
            ],
        },
    ]);
    return answer;
}
async function confirmContinue(message = "Continue?") {
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: "confirm",
            name: "confirm",
            message,
            default: false,
        },
    ]);
    return confirm;
}
async function typePrompt(message) {
    const answer = await inquirer_1.default.prompt([
        {
            type: "input",
            name: "res",
            message: message,
        }
    ]);
    return answer.res;
}
async function remotePrompt() {
    const answer = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "remote",
            message: "Pick a remote to push too: ",
            choices: (0, git_1.getRemotes)()
        }
    ]);
    return answer.remote;
}
async function configKeysPrompt() {
    const answer = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "configKey",
            message: "Which config woulf you like to set?",
            choices: Object.keys(config_1.CONFIG_OPTIONS)
        }
    ]);
    return answer.configKey;
}
async function configValuePrompt(key) {
    let res;
    if (key == "max_diff_tokens") {
        res = await inquirer_1.default.prompt([
            {
                type: "number",
                name: "maxTokens",
                message: "Enter max tokens per diff: ",
                validate: (value) => {
                    if (!Number.isInteger(value) || value <= 0)
                        return "Enter a positive integer";
                    return true;
                }
            }
        ]);
        return res.maxTokens;
    }
    else if (key == "prompt") {
        res = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "prompt",
                message: "Type a custom prompt here, leave blank for default."
            }
        ]);
        res = res.prompt;
        if (res == "")
            res = aiPrompt_1.commitMessagePrompt;
        return res;
    }
    else if (key == "default_origin") {
        res = await inquirer_1.default.prompt([
            {
                type: "list",
                name: "defaultOrigin",
                message: "Select default origin",
                choices: await (0, git_1.getRemotes)()
            }
        ]);
        return res.defaultOrigin;
    }
    else if (key == "model") {
        const config = (0, config_1.loadConfig)();
        const models = ai_1.MODEL_REGISTRY[config.provider];
        res = await inquirer_1.default.prompt([{
                type: "list",
                name: "res",
                message: "Select model:",
                choices: models
            }]);
        return res.res;
    }
    const options = config_1.CONFIG_OPTIONS[key].options;
    if (!options) {
        console.log(`No handler for config key: ${key}`);
        throw new Error(`No handler for config key: ${key}`);
    }
    res = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "res",
            message: `Option: ${key}`,
            choices: options
        }
    ]);
    return res.res;
}
async function ynListPrompt(message) {
    const answer = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "yn",
            message: message,
            choices: [
                {
                    name: "Yes",
                    value: true
                },
                {
                    name: "No",
                    value: false
                }
            ]
        }
    ]);
    return answer.yn;
}
