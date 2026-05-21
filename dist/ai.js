"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = exports.OpenAIProvider = void 0;
exports.getProvider = getProvider;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
require('dotenv').config();
const tiktoken_1 = require("tiktoken");
class OpenAIProvider {
    constructor(config) {
        this.model = "gpt-4o-mini";
        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            throw new Error("Missing openai Key");
        }
        this.client = new openai_1.default({ apiKey: key });
        this.model = config.model;
        this.prompt = config.prompt;
    }
    async generateCommitMessage(diff) {
        const res = await this.client.chat.completions.create({
            model: this.model,
            messages: [{
                    role: "system",
                    content: this.prompt,
                },
                {
                    role: "user",
                    content: diff,
                },
            ],
        });
        return res.choices[0].message.content ?? "";
    }
    async countInputTokens(diff) {
        const enc = (0, tiktoken_1.encoding_for_model)(this.model);
        const sysTokens = enc.encode(this.prompt).length;
        const diffTokens = enc.encode(diff).length;
        enc.free();
        return sysTokens + diffTokens;
    }
}
exports.OpenAIProvider = OpenAIProvider;
class AnthropicProvider {
    constructor(config) {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) {
            throw new Error("Missing anthropic Key");
        }
        this.client = new sdk_1.default({ apiKey: key });
        ;
        this.model = config.model;
        this.prompt = config.prompt;
    }
    async generateCommitMessage(diff) {
        const res = await this.client.messages.create({
            model: this.model,
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `${this.prompt} \n\n ${diff}`,
                },
            ],
        });
        return res.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
    }
    async countInputTokens(diff) {
        const res = await this.client.messages.countTokens({
            model: this.model,
            system: this.prompt,
            messages: [{ role: "user", content: diff }]
        });
        return res.input_tokens;
    }
}
exports.AnthropicProvider = AnthropicProvider;
function getProvider(config) {
    switch (config.provider) {
        case "anthropic":
            return new AnthropicProvider(config);
        case "openai":
            return new OpenAIProvider(config);
        default:
            throw new Error("Unsupported provider");
    }
}
