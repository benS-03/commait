"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicProvider = exports.openaiProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
require('dotenv').config();
function getOpenAiClient() {
    const key = process.env.OPENAI_API_KEY;
    if (!key)
        throw new Error("No open AI key detected in env");
    return new openai_1.default({ apiKey: key });
}
function getAnthropicClient() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key)
        throw new Error("No anthropic key detected in env");
    return new sdk_1.default({ apiKey: key });
}
exports.openaiProvider = {
    async generateCommitMessage(diff, prompt) {
        const client = getOpenAiClient();
        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
                    role: "system",
                    content: prompt,
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
exports.anthropicProvider = {
    async generateCommitMessage(diff, prompt) {
        const client = getAnthropicClient();
        const res = await client.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `${prompt} \n\n ${diff}`,
                },
            ],
        });
        return res.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
    },
};
