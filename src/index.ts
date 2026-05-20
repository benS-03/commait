#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName, commmit, pushChanges } from "./git";
import {openaiProvider, anthropicProvider} from "./ai"
import {  CONFIG_PATH,CommaitConfig,saveConfig, loadConfig, configAutoInit} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";
import { commitMessagePrompt } from "./aiPrompt";
import { push } from "node:stream/iter";
import {configInitPrompt, confirmContinue, confirmCommit} from "./commandPrompts"

const program = new Command();

program.name("commait").description("AI-powered commit message generator").version("1.0.0");

program.command("commit")
.description("Generate Message, commit locally, and optionally push changes")
.option('--dry-run', 'run without commit or pushing')
.action(async (options) => {

    if (isGitRepo())
        console.log("Current repo:" + getRepoName());
    else {
        console.log("Not in git repo");
        process.exit(1);
    };

    const config = loadConfig();
    const diff: string = await getStagedDiff();
    let message: string = "";
    let cont: boolean= true;
    while(cont) {
        if (config.provider == "anthropic"){
            message = await anthropicProvider.generateCommitMessage(diff, config.prompt)
        }
        else if (config.provider == "openai"){
            //openai 
            return;
        }
        else {
            console.log("Unsupported Provdier, try \"commait config init\"")
            return;
        }
        console.log("===========COMMIT MESSAGE===========");
        console.log(message)

        const answer = await confirmCommit();

        if (answer.commitConfirm == 'y')
            cont = false;
        else if (answer.commitConfirm == 'r')
            cont = true;
        else
            process.exit(1);

    }
    if (!options.dryRun){
        commmit(message);
    }

    if (await confirmContinue("Would you like to Push Changes? y/n")){
        if (!options.dryRun){
            pushChanges();
        }
    }

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