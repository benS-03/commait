#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName, commmit, pushChanges, commitWithRetry, git, compressDiffToLimit, parseDiff, stripNoiseFiles, diffFilesToString } from "./git";
import {getProvider,AIProvider ,OpenAIProvider, AnthropicProvider} from "./ai"
import {  CONFIG_PATH,CommaitConfig,saveConfig, loadConfig, configAutoInit} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";
import { commitMessagePrompt } from "./aiPrompt";
import { push } from "node:stream/iter";
import {configInitPrompt, confirmContinue, confirmCommit, typePrompt} from "./commandPrompts";
import {edit} from "external-editor";

import { testDiff } from "./testDiff";
import { parse } from "node:path";


const program = new Command();

program.name("commait").description("AI-powered commit message generator").version("1.0.0");

program.command("commit")
.description("Generate Message, commit locally, and optionally push changes")
.option('--dry-run', 'run without commit or pushing')
.option('-e, --edit', 'edit message before commit')
.option('-c, --context', 'allows addition of further context')
.option('--strip-noise', 'strips noise files from diff')
.action(async (options) => {

    if (isGitRepo())
        console.log("Current repo:" + getRepoName());
    else {
        console.log("Not in git repo");
        process.exit(1);
    };

    const config = loadConfig();
    let diff: string = await getStagedDiff();
    let message: string = "";
    let tokens: number = 0;
    let cont: boolean= true;
    const provider: AIProvider= getProvider(config);

    if(options.stripNoise){
        console.log(`diff length: ${diff.length}`)
        const parsed = parseDiff(diff);
        const stripped = stripNoiseFiles(parsed);
        diff = diffFilesToString(stripped);
        console.log(`diff lenght ${diff.length}`)
    }

    while(cont) {
        if (options.context){
            const context = await typePrompt("Enter context for generation");
            message = await provider.generateCommitMessage(diff, context)
        }
        else {
            message = await provider.generateCommitMessage(diff);
        }
        tokens += await provider.countInputTokens(diff);
        console.log("===========COMMIT MESSAGE===========");
        console.log(message)

        if (config.auto_commit) {
            await commitWithRetry(git, message);
            break;
        }

        const answer = await confirmCommit();

        if (answer.commitConfirm == 'y')
            cont = false;
        else if (answer.commitConfirm == 'r')
            cont = true;
        else
            process.exit(1);

    }
    if(options.edit){
        message = edit(message);
    }
    if (!options.dryRun){
        commitWithRetry(git, message);
    }
    if (config.auto_push) {
        pushChanges();
    }
    else if (await confirmContinue("Would you like to Push Changes? y/n")){
        if (!options.dryRun){
            pushChanges();
        }
    }

    console.log("===========TOKEN USAGE===========");
    console.log(`Total input token usage: ${tokens}`);


})

program.command("testparse")
.description("Tests diff parser")
.action(()=> {

    console.log(testDiff);
    console.log(JSON.stringify(parseDiff(testDiff), null, 2));

})

program.command("push")
.description("Standalone push command")
.action(async() => {
    console.log("Pushing Changes");
    pushChanges();
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

saveConfig(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt, answers.autoCommit, answers. autoPush);
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