import path from "path";
import os from "os";
import fs from "fs";


export type CommaitConfig = {
    provider: "openai" | "anthropic";
    model: string;
    prompt: string;
};


export const CONFIG_PATH = path.join(
    os.homedir(),
    ".commait",
    "config.json"
);

export function loadConfig(): CommaitConfig | null{
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function saveConfig(provider: string, model:string, prompt:string) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });

    // Manually build the config object instead of directly stringifying input
    const configToSave = {
        provider: provider,
        model: model,
        prompt: prompt,
    };

    const jsonString = JSON.stringify(configToSave, null, 2);

    fs.writeFileSync(CONFIG_PATH, jsonString);
}




