import path from "path";
import os from "os";
import fs from "fs";
require('dotenv').config();
import {commitMessagePrompt} from "./aiPrompt"
import {DEFAULT_MODELS, MODEL_REGISTRY} from "./ai"
import { getRemotes } from "./git";
import { ConfigError } from "./errors";

export type CommaitConfig = {
    provider: "openai" | "anthropic";
    model: string;
    prompt: string;
    auto_stage: boolean,
    auto_commit: boolean;
    auto_push: boolean;
    max_diff_tokens: number;
    default_origin: string;
    ask_origin: boolean;
};


type ConfigOption = {
  description: string;
  options: readonly any[] | null;
};

export const CONFIG_OPTIONS: Record<string, ConfigOption> = {
  provider: {
    description: "AI provider to use",
    options: ["openai", "anthropic"],
  },
  model: {
    description: "Model to use for the selected provider",
    options: ["Based on Provider"],
  },
  prompt: {
    description: "Custom prompt for commit message generation",
    options: null,
  },
  auto_stage: {
    description: "Automatically stage all files before commit",
    options: [
      { name: "Enabled", value: true },
      { name: "Disabled", value: false }]
  },
  auto_commit: {
    description: "Commit without confirmation",
    options: [true, false],
  },
  auto_push: {
    description: "Push without confirmation",
    options: [
      { name: "Enabled", value: true },
      { name: "Disabled", value: false }]
  },
  max_diff_tokens: {
    description: "Max tokens per diff before truncation",
    options: ["Number Representing Max Tokens"],
  },
  default_origin: {
    description: "Default remote to push to",
    options: ["Different based on your enviroment"],
  },
  ask_origin: {
    description: "Ask which remote to push to every time",
    options: [
      { name: "Enabled", value: true },
      { name: "Disabled", value: false }]
  },
};



export const CONFIG_PATH = path.join(
    os.homedir(),
    ".commait",
    "config.json"
);

/* ---------------------------------------------------------------
 | loadConfig — loads config and saves as obj
 | args: none
 | returns: {}
 --------------------------------------------------------------- */
export function loadConfig(){
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    } catch {
        configAutoInit();
        const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
        return JSON.parse(raw);
    }
}

/* ---------------------------------------------------------------
 | configSet — rewrites a speiifc congif key given key an value
 | args: key(string), value(string)
 | returns: none
 --------------------------------------------------------------- */
export function configSet(key: string, value: string) {

    const config = loadConfig();
    
    if (!(key in config)) throw new ConfigError(`${key} is not a valid config option. Use "commait config option" to get full list`)
    
     config[key] = value;


    const jsonString = JSON.stringify(config, null, 2);

    fs.writeFileSync(CONFIG_PATH, jsonString);

}
/* ---------------------------------------------------------------
 | saveConfig — given arg for all config keys, saves new config 
 |              file.
 | args: provider(string) model(string) prompt(string) autoCommit(boolean)
 |       autoPush(boolean) max_diff_tokens(number) defOrigin(string)
 |       askOrigin(boolean)
 | returns: none
 --------------------------------------------------------------- */

export function saveConfig(provider: string, model:string, prompt:string, autoStage: boolean = false, autoCommit: boolean = false, autoPush: boolean = false, max_diff_tokens: number = 12000, defOrigin: string = "origin", askOrigin: boolean = false) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });

    // Manually build the config object instead of directly stringifying input
    const configToSave = {
        provider: provider,
        model: model,
        prompt: prompt,
        auto_stage: autoStage,
        auto_commit: autoCommit,
        auto_push: autoPush,
        max_diff_tokens: max_diff_tokens,
        default_origin: defOrigin,
        ask_origin: askOrigin
    };

    const jsonString = JSON.stringify(configToSave, null, 2);

    fs.writeFileSync(CONFIG_PATH, jsonString);
}

/* ---------------------------------------------------------------
 | configAutoInit — create new config file with default settings
 | args: none
 | returns: none
 --------------------------------------------------------------- */
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



