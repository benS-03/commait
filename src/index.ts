#!/usr/bin/env node

import { getStagedDiff, stageAll, isGitRepo, commmit, pushChanges, commitWithRetry, git, compressDiffToLimit, parseDiff, stripNoiseFiles, diffFilesToString } from "./git";
import {getProvider,AIProvider ,OpenAIProvider, AnthropicProvider} from "./ai"
import { configSet, CONFIG_PATH,CommaitConfig,saveConfig, loadConfig, configAutoInit, CONFIG_OPTIONS} from "./config";
import { Command } from "commander";
import inquirer from "inquirer";
import { commitMessagePrompt } from "./aiPrompt";
import { push } from "node:stream/iter";
import { configKeysPrompt,configInitPrompt, ynListPrompt, confirmContinue, confirmCommit, typePrompt, remotePrompt, configValuePrompt} from "./commandPrompts";
import ora from "ora";
import {edit} from "@inquirer/external-editor"

import { testDiff } from "./testDiff";
import { parse } from "node:path";
import { CommaitError } from "./errors";


const program = new Command();
program.name("commait").description("AI-powered commit message generator").version("1.0.0");

// ======= COMMIT COMMANDS =======

program.command("commit")
.description("Generate Message, commit locally, and optionally push changes")
.option('--dry-run', 'run without commit or pushing')
.option('-e, --edit', 'edit message before commit')
.option('-c, --context', 'allows addition of further context')
.option('--strip-noise', 'strips noise files from diff')
.option("--verbose", 'shows total token usage at end of commit')
.action(async (options) => {


    //======= Data Loading, Variable Initialization =======

    const config = loadConfig();
    let message: string = "";
    let tokens: number = 0;
    let cont: boolean= true;


    if (config.auto_stage){
        try {
            await stageAll();
        } catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
        }
    }

    let diff: string = "";

    try {
        diff = await getStagedDiff();
    } catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
    }

    const provider: AIProvider= getProvider(config);
    
    
    //fun comment

    //======= Pre Generation diff compression =======
    
    // Option to force compression
    if(options.stripNoise){
        console.log(`diff length: ${diff.length}`)
        const parsed = parseDiff(diff);
        const stripped = stripNoiseFiles(parsed);
        diff = diffFilesToString(stripped);
        console.log(`diff lenght ${diff.length}`)
    }
    //Compression
    let compressionLog: string[];
    try{
        ({diff, log: compressionLog} = await compressDiffToLimit(diff, config.max_diff_tokens, provider ));
        compressionLog.forEach((log) => {
            console.log(log);
        })
    } catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
    }
    //fun comment
    // ======= Main commit loop =======
    const spinner = ora({
        text: "Generating Commit message. . .",
        spinner: "flip",
        color: "green"
    })
    while(cont) {
        // Message generation with optional context

        if (options.context){

            const context = await typePrompt("Enter context for generation");
            spinner.start();
            let message: string = "";

            try {
            message = await provider.generateCommitMessage(diff, context)
            }catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
        }
            spinner.succeed("Commit Message Generated")
        }
        else {
            spinner.start();
            try {
            message = await provider.generateCommitMessage(diff);
            }catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
                }
            }
            spinner.succeed("Commit Message Generated")

        }
        // Token tracking and response loggin ( needs work)
        tokens += await provider.countInputTokens(diff);
        console.log("===========COMMIT MESSAGE===========");
        console.log(message)
        
        // Auto commit
        if (config.auto_commit) {
            if (!options.dryRun)
                try {
                await commitWithRetry(git, message);
                }catch (err) {
                    if (err instanceof CommaitError) {
                    console.error(`commait: ${err.message}`);
                    process.exit(err.exitCode);
                }
            }
            process.exit(0);
        }


        //Prompt to commit or regenerate
        const answer = await confirmCommit();

        // Flag logic for regeneration
        if (answer.commitConfirm == 'y')
            cont = false;
        else if (answer.commitConfirm == 'r')
            cont = true;
        else
            process.exit(0);

    }

    // ======= Optional Editing and Other =======

    //Editing of commmit
    if(options.edit){
        message = edit(message);
    }
    //Dry
    if (!options.dryRun){
        try {
        commitWithRetry(git, message);
        }catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
        }
    }
    // Pushing flow with auto and manual
    if (config.auto_push) {
        let remote: string = config.default_origin;
        if (config.ask_origin)
            remote = await remotePrompt();
        try{
        pushChanges(config.default_origin);
        }catch (err) {
            if (err instanceof CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
        }
    }
    else if (await ynListPrompt("Would you like to push changes?")){
        if (!options.dryRun){
            let remote: string = config.default_origin;
            if (config.ask_origin)
                remote = await remotePrompt();
            try{
                pushChanges(config.default_origin);
            }catch (err) {
                if (err instanceof CommaitError) {
                    console.error(`commait: ${err.message}`);
                    process.exit(err.exitCode);
                }
            }
        }
    }

    if (options.verbose){
        console.log("===========TOKEN USAGE===========");
        console.log(`Total input token usage: ${tokens}`);
    }
})

// ======= Push Commands =======

program.command("push")
.description("Standalone push command")
.action(async() => {
    console.log("Pushing Changes");
    const config = loadConfig();
    // auto remote or not.
    let remote: string = config.default_origin;
    if (config.ask_origin)
        remote = await remotePrompt();
    try{
        pushChanges(config.default_origin);
    }catch (err) {
        if (err instanceof CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
    }
        
})

// fun comment
// ohmy god another fun comment

// ======= Config Commands =======

const config = program.command("config");

// ======= Initialize Config Command =======

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
saveConfig(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt, answers.autoStage, answers.autoCommit, answers.autoPush, answers.maxTokens, answers.defRemote, answers.askOrigin);
});

// ======= Get user Config Command =======

config.command("get")
.description("Display current config")
.action(async () => {
    const config = await loadConfig();
    console.log(config);
});

// ======= Get Filepath to Config =======

config.command("loc")
.description("Dispay path to config")
.action(async () => {
    console.log("Path to config: " + CONFIG_PATH);
})

// ======= Set specific values in config =======

config.command("set [key] [value]")
.description("Set Individual config values")
.action(async (key, value) => {
    if (!key) {
        key = await configKeysPrompt();
    }
    if (!value) {
        value = await configValuePrompt(key);
    }
    try{
        configSet(key,value)
    }catch (err) {
        if (err instanceof CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
}})

// ======= Display All Config Keys =======

config.command("options")
.description("List config options for usage in config set")
.action(() => {
    Object.entries(CONFIG_OPTIONS).forEach(([key, value]) => {
        console.log(`${key}: \n\t${value.description}\n\tOptions: ${value.options}`)
    })
})

program.parse();