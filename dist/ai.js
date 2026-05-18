"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicProvider = exports.openaiProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
require('dotenv').config();
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
exports.openaiProvider = {
    async generateCommitMessage(diff) {
        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                    role: "system",
                    content: "You write concise git commit messages.",
                },
                {
                    role: "user",
                    content: diff,
                },
            ],
        });
        return res.choices[0].message.content ?? "";
    }
};
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
exports.anthropicProvider = {
    async generateCommitMessage(diff) {
        const res = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `Write a git commit message for this diff: \n\n ${diff}`,
                },
            ],
        });
        return res.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
    },
};
