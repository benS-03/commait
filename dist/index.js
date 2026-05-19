#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("./git");
const ai_1 = require("./ai");
const config_1 = require("./config");
const commander_1 = require("commander");
const inquirer_1 = __importDefault(require("inquirer"));
const aiPrompt_1 = require("./aiPrompt");
const commandPrompts_1 = require("./commandPrompts");
const program = new commander_1.Command();
program.name("commait").description("AI-powered commit message generator").version("1.0.0");
program.command("commit")
    .description("Generate Message, commit locally, and optionally push changes")
    .action(async () => {
    if ((0, git_1.isGitRepo)())
        console.log("Current repo:" + (0, git_1.getRepoName)());
    else {
        console.log("Not in git repo");
        process.exit(1);
    }
    ;
    let config = (0, config_1.loadConfig)();
    if (config == null) {
        (0, config_1.configAutoInit)();
        config = (0, config_1.loadConfig)();
    }
    const diff = await (0, git_1.getStagedDiff)();
    console.log("PROMPTTTTT:" + config?.prompt);
    let message = "";
    if (!config) {
        console.log("no config found");
        return;
    }
    else if (config.provider == "anthropic") {
        message = await ai_1.anthropicProvider.generateCommitMessage(diff, config.prompt);
    }
    else {
        //openai 
        return;
    }
    (0, git_1.commmit)(message);
    const cont = await inquirer_1.default.prompt([
        {
            type: "confirm",
            name: "push confirm",
            message: "Would you like to push changes? y/n"
        }
    ]);
    if (cont) {
        (0, git_1.pushChanges)();
    }
});
program.command("diff")
    .description("show staged git diff")
    .action(async () => {
    if ((0, git_1.isGitRepo)())
        console.log("Current repo:" + (0, git_1.getRepoName)());
    else {
        console.log("Not in git repo");
        process.exit(1);
    }
    const diff = await (0, git_1.getStagedDiff)();
    console.log(diff);
});
program.command("gen")
    .description("generate a commit message and print")
    .action(async () => {
    const diff = await (0, git_1.getStagedDiff)();
});
const config = program.command("config");
config.command("init")
    .description("initialize commait config")
    .action(async () => {
    const answers = await (0, commandPrompts_1.configInitPrompt)();
    let prompt;
    if (answers.prompt == "") {
        prompt = aiPrompt_1.commitMessagePrompt;
    }
    else {
        prompt = answers.prompt;
    }
    (0, config_1.saveConfig)(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt);
});
config.command("get")
    .description("Display current config")
    .action(async () => {
    const config = await (0, config_1.loadConfig)();
    console.log(config);
});
config.command("loc")
    .description("Dispay path to config")
    .action(async () => {
    console.log("Path to config: " + config_1.CONFIG_PATH);
});
program.parse();
