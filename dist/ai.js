"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = exports.OpenAIProvider = exports.DEFAULT_MODELS = exports.MODEL_REGISTRY = void 0;
exports.getProvider = getProvider;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
require('dotenv').config();
const tiktoken_1 = require("tiktoken");
const errors_1 = require("./errors");
exports.MODEL_REGISTRY = {
    openai: [
        "gpt-4.1-nano", // Ultra fast/cheap option
        "gpt-4.1-mini", //Fast, cheap, suprisingly strong for coding. Good default
        "gpt-4.1", //Best general purpose, good reasoning, more expoensive and slow
        "gpt-5.1", // High-end reasoning, explain deeply
        "gpt-5.2" // frontier model, best overall quality, most expensive
    ],
    anthropic: [
        "claude-haiku-4-5-20251001", // Fast Cheap
        "claude-sonnet-4-6", //Best balance, strong quality. Good defaut
        "claude-opus-4-7" //Highest Quality reasoning model. Expensive
    ]
};
exports.DEFAULT_MODELS = {
    openai: "gpt-4.1-mini",
    anthropic: "claude-sonnet-4-6"
};
/* ---------------------------------------------------------------
 | OpenAiProvider
 |
 | This represent an Open AI client, extenting AIprovider and
 | allowing ai functionality with openai.
 |
 | fields:
 |   client (OpenAI) - open ai package object
 |   model. (string) - model to be used
 |   prompt (string) — prompt to be used
 |
 | methods:
 |   constructor(config:CommaitConfig) - construcor
 |   generateCommitMessage(diff:string,context?: string) - generate message w/ optional context
 |   countInputTokens(diff:string) - returns token count for string
 |   getModel() - returns list of usable models
 --------------------------------------------------------------- */
class OpenAIProvider {
    constructor(config) {
        this.model = "gpt-4o-mini";
        const key = process.env.OPENAI_API_KEY;
        if (!key) {
            throw new errors_1.AiProviderError("Missing OpenAI API Key.");
        }
        try {
            this.client = new openai_1.default({ apiKey: key });
        }
        catch (err) {
            throw new errors_1.AiProviderError(`Failed to construct OpenAi provider with API Key: ${err.message}`);
        }
        this.model = config.model;
        this.prompt = config.prompt;
    }
    async generateCommitMessage(diff, context = "") {
        let contextMessage = "";
        if (context) {
            contextMessage = `Consider this user provided context ${context}\n`;
        }
        try {
            const res = await this.client.chat.completions.create({
                model: this.model,
                messages: [{
                        role: "system",
                        content: contextMessage + this.prompt,
                    },
                    {
                        role: "user",
                        content: diff,
                    },
                ],
            });
            return res.choices[0].message.content ?? "";
        }
        catch (err) {
            throw new errors_1.AiProviderError(`Error requesting OpenAi message generation: ${err.message}`);
        }
    }
    async countInputTokens(diff) {
        const enc = (0, tiktoken_1.encoding_for_model)(this.model);
        const sysTokens = enc.encode(this.prompt).length;
        const diffTokens = enc.encode(diff).length;
        enc.free();
        return sysTokens + diffTokens;
    }
    async getModels() {
        return Array.from(exports.MODEL_REGISTRY.openai);
    }
}
exports.OpenAIProvider = OpenAIProvider;
/* ---------------------------------------------------------------
 | AnthropicProvider
 |
 | This represent an Anthropic client, extenting AIprovider and
 | allowing ai functionality with anthropic.
 |
 | fields:
 |   client (Anthropic) - open ai package object
 |   model. (string) - model to be used
 |   prompt (string) — prompt to be used
 |
 | methods:
 |   constructor(config:CommaitConfig) - construcor
 |   generateCommitMessage(diff:string,context?: string) - generate message w/ optional context
 |   countInputTokens(diff:string) - returns token count for string
 |   getModel() - returns list of usable models
 --------------------------------------------------------------- */
class AnthropicProvider {
    constructor(config) {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) {
            throw new errors_1.AiProviderError("Missing Anthropic API Key");
        }
        try {
            this.client = new sdk_1.default({ apiKey: key });
        }
        catch (err) {
            throw new errors_1.AiProviderError(`Failed to construct Anthropic provider with API Key: ${err.message}`);
        }
        this.model = config.model;
        this.prompt = config.prompt;
    }
    async generateCommitMessage(diff, context = "") {
        let contextMessage = "";
        if (context) {
            contextMessage = `Consider this user provided context ${context}\n`;
        }
        let res;
        try {
            res = await this.client.messages.create({
                model: this.model,
                max_tokens: 200,
                messages: [
                    {
                        role: "user",
                        content: `${contextMessage}\n\n${this.prompt} \n\n ${diff}`,
                    },
                ],
            });
        }
        catch (err) {
            throw new errors_1.AiProviderError(`Failed Anthropic message generation request: ${err.message}`);
        }
        return res.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");
    }
    async countInputTokens(diff) {
        let res;
        try {
            res = await this.client.messages.countTokens({
                model: this.model,
                system: this.prompt,
                messages: [{ role: "user", content: diff }]
            });
        }
        catch (err) {
            throw new errors_1.AiProviderError(`Failed Anthropic token count request: ${err.message}`);
        }
        return res.input_tokens;
    }
    async getModels() {
        return Array.from(exports.MODEL_REGISTRY.anthropic);
    }
}
exports.AnthropicProvider = AnthropicProvider;
/* ---------------------------------------------------------------
 | OllamaProvider
 |
 | This represent an Ollama client, extenting AIprovider and
 | allowing ai functionality with Ollama.
 |
 | fields:
 |   client (Ollama) - open ai package object
 |   model. (string) - model to be used
 |   prompt (string) — prompt to be used
 |
 | methods:
 |   constructor(config:CommaitConfig) - construcor
 |   generateCommitMessage(diff:string,context?: string) - generate message w/ optional context
 |   countInputTokens(diff:string) - returns token count for string
 |   getModel() - returns list of usable models
 --------------------------------------------------------------- */
// export class OllamaProvider implements AIProvider{
//     private client: Ollama;
//     private prompt:string;
//     private model: string;
//     constructor(config: CommaitConfig) {
//         this.client = new Ollama({ host: "http://localhost:11434"});
//         this.prompt = config.prompt;
//         this.model = config.model;
//     }
//     async generateCommitMessage(diff: string, context: string): Promise<string> {
//         let contextMessage = "";
//         if (context){
//             contextMessage = `Consider this user provided constext ${context}\n`
//         } 
//         const res = await this.client.chat({
//             model: this.model,
//             messages: [
//                 {
//                     role: "system",
//                     content: contextMessage + this.prompt,
//                 },
//                 {
//                     role: "user",
//                     content: `Write a commit message for this diff:\n\n${diff}`,
//                 },
//             ]
//         });
//         return res.message.content.trim();
//     }
//     async countInputTokens(diff: string) {
//         return Math.ceil(diff.length / 4);
//     }
//     async getModels(): Promise<string[]> {
//         const models = await this.client.list();
//         return ["NOT IMPLEMENTED"]
//     }
// }
/* ---------------------------------------------------------------
 | getProvider — gives provider given config
 | args: config(CommaitConfig)
 | returns: AIProvider
 --------------------------------------------------------------- */
function getProvider(config) {
    switch (config.provider) {
        case "anthropic":
            return new AnthropicProvider(config);
        case "openai":
            return new OpenAIProvider(config);
        default:
            throw new errors_1.AiProviderError(`Unsupported provider: ${config.provider}`);
    }
}
