#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("./git");
const ai_1 = require("./ai");
const config_1 = require("./config");
const commander_1 = require("commander");
const aiPrompt_1 = require("./aiPrompt");
const commandPrompts_1 = require("./commandPrompts");
const external_editor_1 = require("external-editor");
const program = new commander_1.Command();
program.name("commait").description("AI-powered commit message generator").version("1.0.0");
program.command("commit")
    .description("Generate Message, commit locally, and optionally push changes")
    .option('--dry-run', 'run without commit or pushing')
    .option('-e, --edit', 'edit message before commit')
    .action(async (options) => {
    if ((0, git_1.isGitRepo)())
        console.log("Current repo:" + (0, git_1.getRepoName)());
    else {
        console.log("Not in git repo");
        process.exit(1);
    }
    ;
    const config = (0, config_1.loadConfig)();
    const diff = await (0, git_1.getStagedDiff)();
    let message = "";
    let tokens = 0;
    let cont = true;
    const provider = (0, ai_1.getProvider)(config);
    while (cont) {
        message = await provider.generateCommitMessage(diff);
        tokens += await provider.countInputTokens(diff);
        console.log("===========COMMIT MESSAGE===========");
        console.log(message);
        if (config.auto_commit) {
            (0, git_1.commmit)(message);
            break;
        }
        const answer = await (0, commandPrompts_1.confirmCommit)();
        if (answer.commitConfirm == 'y')
            cont = false;
        else if (answer.commitConfirm == 'r')
            cont = true;
        else
            process.exit(1);
    }
    if (options.edit) {
        message = (0, external_editor_1.edit)(message);
    }
    if (!options.dryRun) {
        (0, git_1.commmit)(message);
    }
    if (config.auto_push) {
        (0, git_1.pushChanges)();
    }
    else if (await (0, commandPrompts_1.confirmContinue)("Would you like to Push Changes? y/n")) {
        if (!options.dryRun) {
            (0, git_1.pushChanges)();
        }
    }
    console.log("===========TOKEN USAGE===========");
    console.log(`Total input token usage: ${tokens}`);
});
program.command("push")
    .description("Standalone push command")
    .action(async () => {
    console.log("Pushing Changes");
    (0, git_1.pushChanges)();
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
    (0, config_1.saveConfig)(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt, answers.autoCommit, answers.autoPush);
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
