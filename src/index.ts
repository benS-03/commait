#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName } from "./git";
import {openaiProvider, anthropicProvider} from "./ai"
import {saveConfig, loadConfig} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";

const program = new Command();

program.name("commait").description("AI-powered commit message generator").version("1.0.0");



program.command("diff")
.description("show staged git diff")
.action(async () => {
    if (isGitRepo())
    console.log("Current repo:" + getRepoName());
else {
    console.log("Not in git repo");
    process.exit(1);
}
    const diff = await getStagedDiff();
    console.log(diff);
});

program.command("gen")
.description("generate a commit message and print")
.action(async () => {
    const diff = await getStagedDiff();
    const message = await anthropicProvider.generateCommitMessage(diff);
    console.log(message);
})

const config = program.command("config");

config.command("init")
.description("initialize commait config")
.action(async () => {
    console.log("inquirer import:", inquirer);
    const answers = await inquirer.prompt([

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
saveConfig(answers);
});

config.command("get")
.description("Display current config")
.action(async () => {
    const config = await loadConfig();
    console.log(config);
});

program.parse();