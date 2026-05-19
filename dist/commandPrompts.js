"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configInitPrompt = configInitPrompt;
const inquirer_1 = __importDefault(require("inquirer"));
async function configInitPrompt() {
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
            choices: ["gpt-4o-mini", "gpt-4o"],
            when: (ans) => ans.provider === "openai",
        },
        {
            type: "list",
            name: "anthropicModel",
            message: "Choose Anthropic model:",
            choices: [
                "claude-sonnet-4-6",
                "josh7",
            ],
            when: (ans) => ans.provider === "anthropic",
        },
        {
            type: "input",
            name: "prompt",
            message: "Type a custom prompt here, leave blank for default."
        },
    ]);
    return answers;
}
