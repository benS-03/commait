"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configInitPrompt = configInitPrompt;
exports.confirmCommit = confirmCommit;
exports.confirmContinue = confirmContinue;
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
