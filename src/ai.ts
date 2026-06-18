import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk"
require('dotenv').config();
import { encoding_for_model } from "tiktoken";
import {loadConfig, CommaitConfig } from "./config";
import { Ollama } from "ollama";
import {AiProviderError} from "./errors"


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
    generateCommitMessage(diff: string, context?: string): Promise<string>;
    countInputTokens(diff: string): Promise<number>;
    getModels(): Promise<string[]>,
}

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
export class OpenAIProvider implements AIProvider {
    private client: OpenAI;
    private model: string = "gpt-4o-mini";
    private prompt:string;

    constructor(config: CommaitConfig) {
        const key = process.env.OPENAI_API_KEY;

        if (!key) {
            throw new AiProviderError("Missing OpenAI API Key.");
        }
        try {
            this.client = new OpenAI({apiKey: key});
        }catch(err: any){
            throw new AiProviderError(`Failed to construct OpenAi provider with API Key: ${err.message}`)
        }   

        this.model = config.model;
        this.prompt = config.prompt;
    }

    async generateCommitMessage(diff: string, context: string = ""): Promise<string> {
        let contextMessage = "";
        if (context){
            contextMessage = `Consider this user provided context ${context}\n`
        } 
        try{    
            const res = await this.client.chat.completions.create({
                model: this.model,
                messages: [ {
                    role:"system",
                    content: contextMessage + this.prompt,
                },
                {
                    role: "user",
                    content: diff,
                },
                ],
            });
            return res.choices[0].message.content ?? "";
        }catch (err: any){
            throw new AiProviderError(`Error requesting OpenAi message generation: ${err.message}`);
        }
    }

    async countInputTokens(diff: string): Promise<number> {
        
        const enc = encoding_for_model(this.model as any);
        const sysTokens = enc.encode(this.prompt).length;
        const diffTokens = enc.encode(diff).length;

        enc.free();
        return sysTokens + diffTokens;
    }

    async getModels(): Promise<string[]> {
        return Array.from(MODEL_REGISTRY.openai);
    }
}

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
export class AnthropicProvider implements AIProvider {
    private client: Anthropic;
    private model: string;
    private prompt:string;
    constructor(config: CommaitConfig) {
        const key = process.env.ANTHROPIC_API_KEY;

        if (!key) {
            throw new AiProviderError("Missing Anthropic API Key");
        }

        try {
            this.client = new Anthropic({apiKey: key});
        }catch(err: any){
            throw new AiProviderError(`Failed to construct Anthropic provider with API Key: ${err.message}`)
        }

        this.model = config.model;
        this.prompt = config.prompt;
    }

    async generateCommitMessage(diff: string, context: string = ""): Promise<string> {
        let contextMessage = "";
        if (context) {
            contextMessage = `Consider this user provided context ${context}\n`
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
        } catch (err: any){
            throw new AiProviderError(`Failed Anthropic message generation request: ${err.message}`);
        }
        return res.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");   
    }

    async countInputTokens(diff: string): Promise<number> {
        let res;
        try{
            res = await this.client.messages.countTokens({
            model: this.model,
            system: this.prompt,
            messages: [{role: "user", content: diff}]
        })
        }catch (err: any) {
            throw new AiProviderError(`Failed Anthropic token count request: ${err.message}`);
        }

        return res.input_tokens;
    }

    async getModels(): Promise<string[]> {
        return Array.from(MODEL_REGISTRY.openai);
    }
}
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
export function getProvider(config: CommaitConfig): AIProvider {
    switch (config.provider) {
        case "anthropic":
            return new AnthropicProvider(config);
        case "openai":
            return new OpenAIProvider(config);
        default:
            throw new AiProviderError(`Unsupported provider: ${config.provider}`);
    
    }
}
