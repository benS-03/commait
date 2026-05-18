#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName, commmit, pushChanges } from "./git";
import {openaiProvider, anthropicProvider} from "./ai"
import { CommaitConfig,saveConfig, loadConfig} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";
import { commitMessagePrompt } from "./prompt";
import { push } from "node:stream/iter";

const program = new Command();

program.name("commait").description("AI-powered commit message generator").version("1.0.0");

program.command("commit")
.description("Generate Message, commit locally, and optionally push changes")
.action(async () => {
    if (isGitRepo())
        console.log("Current repo:" + getRepoName());
    else {
        console.log("Not in git repo");
        process.exit(1);
    };

    const config = loadConfig();
    const diff: string = await getStagedDiff();
    let message: string = "";
    if (!config) {
        console.log("no config found");
        return;
    }
    else if (config.provider == "anthropic"){
        message = await anthropicProvider.generateCommitMessage(diff, config.prompt)
    }
    else {
        //openai 
        return;
    }

    commmit(message);

    const cont = await inquirer.prompt([
        {
            type: "confirm",
            name: "push confirm",
            message: "Would you like to push changes? y/n"
        }
    ]);

    if (cont){
        pushChanges()
    }

})

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
})

const config = program.command("config");

config.command("init")
.description("initialize commait config")
.action(async () => {
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
  {
    type: "input",
    name: "prompt",
    message: "Type a custom prompt here, leave blank for default."
  },

]);
let prompt:string;
if (answers.prompt == "") {
    prompt = commitMessagePrompt;
}
else {
    prompt = answers.prompt;
}

saveConfig(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt );
});

config.command("get")
.description("Display current config")
.action(async () => {
    const config = await loadConfig();
    console.log(config);
});

program.parse();