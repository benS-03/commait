import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk"
require('dotenv').config();

export interface AIProvider {
    generateCommitMessage(diff: string, prompt: string): Promise<string>;
}


function getOpenAiClient(){
    const key = process.env.OPENAI_API_KEY;

    if (!key)
        throw new Error("No open AI key detected in env");

    return new OpenAI({apiKey: key});
}

function getAnthropicClient(){
    const key = process.env.ANTHROPIC_API_KEY;

    if (!key)
        throw new Error("No anthropic key detected in env");

    return new Anthropic({apiKey: key});
}

export const openaiProvider: AIProvider = {
    async generateCommitMessage(diff: string, prompt: string) {
        const client = getOpenAiClient();
        const res = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [ {
                role:"system",
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
}


export const anthropicProvider: AIProvider = {
    async generateCommitMessage(diff: string, prompt: string) {
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
        .join("");    },
}