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
const program = new commander_1.Command();
program.name("commait").description("AI-powered commit message generator").version("1.0.0");
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
    const message = await ai_1.anthropicProvider.generateCommitMessage(diff);
    console.log(message);
});
const config = program.command("config");
config.command("init")
    .description("initialize commait config")
    .action(async () => {
    console.log("inquirer import:", inquirer_1.default);
    const answers = await inquirer_1.default.prompt([
        {
            type: "list",
            name: "provider",
            message: "Choose your AI provider:",
            choices: ["openai", "anthropic"],
        },
        {
            type: "list",
            name: "openaiModel",
            message: "Choose OpenAI model:",
            choices: ["gpt-4o-mini", "gpt-4o"],
            when: (ans) => ans.provider === "openai",
        },
        {
            type: "list",
            name: "anthropicModel",
            message: "Choose Anthropic model:",
            choices: [
                "claude-sonnet-4-6",
                "josh7",
            ],
            when: (ans) => ans.provider === "anthropic",
        },
    ]);
    (0, config_1.saveConfig)(answers);
});
config.command("get")
    .description("Display current config")
    .action(async () => {
    const config = await (0, config_1.loadConfig)();
    console.log(config);
});
program.parse();
