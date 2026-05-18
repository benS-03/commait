import path from "path";
import os from "os";
import fs from "fs";


export type CommaitConfig = {
    provider: "openai" | "anthropic";
    openaiModel?: string;
    anthropicModel?: string;
};


export const CONFIG_PATH = path.join(
    os.homedir(),
    ".commait",
    "config.json"
);

export function loadConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function saveConfig(config: any) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), {recursive: true});

    fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify(config, null, 2)
    )
}




