import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk"
require('dotenv').config();
import { encoding_for_model } from "tiktoken";
import {loadConfig, CommaitConfig } from "./config";


export const MODEL_REGISTRY = {
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
} as const;

export const DEFAULT_MODELS = {
    openai: "gpt-4.1-mini",
    anthropic: "claude-sonnet-4-6"
} as const;
export interface AIProvider {
    generateCommitMessage(diff: string): Promise<string>;
    countInputTokens(diff: string): Promise<number>;
}

export class OpenAIProvider implements AIProvider {
    private client: OpenAI;
    private model: string = "gpt-4o-mini";
    private prompt:string;

    constructor(config: CommaitConfig) {
        const key = process.env.OPENAI_API_KEY;

        if (!key) {
            throw new Error("Missing openai Key");
        }

        this.client = new OpenAI({apiKey: key});

        this.model = config.model;
        this.prompt = config.prompt;
    }

    async generateCommitMessage(diff: string): Promise<string> {
         const res = await this.client.chat.completions.create({
            model: this.model,
            messages: [ {
                role:"system",
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

    async countInputTokens(diff: string): Promise<number> {
        
        const enc = encoding_for_model(this.model as any);
        const sysTokens = enc.encode(this.prompt).length;
        const diffTokens = enc.encode(diff).length;

        enc.free();
        return sysTokens + diffTokens;
    }
}

export class AnthropicProvider implements AIProvider {
    private client: Anthropic;
    private model: string;
    private prompt:string;
    constructor(config: CommaitConfig) {
        const key = process.env.ANTHROPIC_API_KEY;

        if (!key) {
            throw new Error("Missing anthropic Key");
        }

        this.client = new Anthropic({apiKey: key});;

        this.model = config.model;
        this.prompt = config.prompt;
    }

    async generateCommitMessage(diff: string): Promise<string> {
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

    async countInputTokens(diff: string): Promise<number> {
        const res = await this.client.messages.countTokens({
            model: this.model,
            system: this.prompt,
            messages: [{role: "user", content: diff}]
        })

        return res.input_tokens;
    }
}


export function getProvider(config: CommaitConfig): AIProvider {
    switch (config.provider) {
        case "anthropic":
            return new AnthropicProvider(config);
        case "openai":
            return new OpenAIProvider(config);
        default:
            throw new Error("Unsupported provider");
    
    }
}