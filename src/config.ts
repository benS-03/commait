import path from "path";
import os from "os";
import fs from "fs";
require('dotenv').config();
import {commitMessagePrompt} from "./aiPrompt"
import {DEFAULT_MODELS} from "./ai"

export type CommaitConfig = {
    provider: "openai" | "anthropic";
    model: string;
    prompt: string;
    auto_commit: boolean;
    auto_push: boolean;
};


export const CONFIG_PATH = path.join(
    os.homedir(),
    ".commait",
    "config.json"
);

export function loadConfig(): CommaitConfig{
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        configAutoInit();
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    }
}

export function saveConfig(provider: string, model:string, prompt:string, autoCommit: boolean = false, autoPush: boolean = false) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });

    // Manually build the config object instead of directly stringifying input
    const configToSave = {
        provider: provider,
        model: model,
        prompt: prompt,
        auto_commit: autoCommit,
        auto_push: autoPush
    };

    const jsonString = JSON.stringify(configToSave, null, 2);

    fs.writeFileSync(CONFIG_PATH, jsonString);
}

export function configAutoInit() {

    let provider: string, model: string, prompt: string;

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    if ( anthropicKey){
        saveConfig("anthropic",DEFAULT_MODELS.anthropic, commitMessagePrompt);
    }
    else if (openaiKey) {
        saveConfig("openai", DEFAULT_MODELS.openai, commitMessagePrompt);
    }
    else {
        saveConfig("none", "none", commitMessagePrompt);
    }
}



