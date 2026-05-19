#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName, commmit, pushChanges } from "./git";
import {openaiProvider, anthropicProvider} from "./ai"
import {  CONFIG_PATH,CommaitConfig,saveConfig, loadConfig, configAutoInit} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";
import { commitMessagePrompt } from "./aiPrompt";
import { push } from "node:stream/iter";
import {configInitPrompt} from "./commandPrompts"

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

    let config = loadConfig();

    if ( config == null) {
        configAutoInit();
        config = loadConfig();
    }
    const diff: string = await getStagedDiff();
    console.log("PROMPTTTTT:"+config?.prompt);
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
    const answers = await configInitPrompt();
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

config.command("loc")
.description("Dispay path to config")
.action(async () => {
    console.log("Path to config: " + CONFIG_PATH);
})

program.parse();