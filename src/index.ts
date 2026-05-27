#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName, commmit, pushChanges, commitWithRetry, git, compressDiffToLimit, parseDiff, stripNoiseFiles, diffFilesToString } from "./git";
import {getProvider,AIProvider ,OpenAIProvider, AnthropicProvider} from "./ai"
import { configSet, CONFIG_PATH,CommaitConfig,saveConfig, loadConfig, configAutoInit, CONFIG_OPTIONS} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";
import { commitMessagePrompt } from "./aiPrompt";
import { push } from "node:stream/iter";
import { configKeysPrompt,configInitPrompt, confirmContinue, confirmCommit, typePrompt, remotePrompt, configValuePrompt} from "./commandPrompts";
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
    if (diff == "")
    {
        console.log("Empty diff, did you git add anything?");
        process.exit(1);
    }
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
    let compressionLog: string[];
    try{
        ({diff, log: compressionLog} = await compressDiffToLimit(diff, config.max_diff_tokens, provider ));
        compressionLog.forEach((log) => {
            console.log(log);
        })
    } catch (err) {
        if (err instanceof Error)
            console.log(err.message);
        else 
            console.log(err);
        process.exit(1);
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
            process.exit(1);
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

        if (config.ask_origin)
            pushChanges(await remotePrompt());
        else 
            pushChanges(config.default_origin);
    }
    else if (await confirmContinue("Would you like to Push Changes? y/n")){
        if (!options.dryRun){
            if (config.ask_origin)
                pushChanges(await remotePrompt());
            else
                pushChanges(config.default_origin);
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
    const config = loadConfig();
    if (config.ask_origin)
        pushChanges(await remotePrompt());
    else
        pushChanges(config.default_origin);
})
// fun comment
// ohmy god another fun comment
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

saveConfig(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt, answers.autoCommit, answers.autoPush, answers.maxTokens, answers.defRemote, answers.askOrigin);
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

config.command("set [key] [value]")
.description("Set Individual config values")
.action(async (key, value) => {
    if (!key) {
        key = await configKeysPrompt();
    }
    if (!value) {
        value = await configValuePrompt(key);
    }

    configSet(key,value)
})

config.command("options")
.description("List config options for usage in config set")
.action(() => {
    Object.entries(CONFIG_OPTIONS).forEach(([key, value]) => {
        console.log(`${key}: \n\t${value.description}\n\tOptions: ${value.options}`)
    })
})

program.parse();