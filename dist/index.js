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
const testDiff_1 = require("./testDiff");
const program = new commander_1.Command();
program.name("commait").description("AI-powered commit message generator").version("1.0.0");
program.command("commit")
    .description("Generate Message, commit locally, and optionally push changes")
    .option('--dry-run', 'run without commit or pushing')
    .option('-e, --edit', 'edit message before commit')
    .option('-c, --context', 'allows addition of further context')
    .option('--strip-noise', 'strips noise files from diff')
    .action(async (options) => {
    if ((0, git_1.isGitRepo)())
        console.log("Current repo:" + (0, git_1.getRepoName)());
    else {
        console.log("Not in git repo");
        process.exit(1);
    }
    ;
    const config = (0, config_1.loadConfig)();
    let diff = await (0, git_1.getStagedDiff)();
    if (diff == "") {
        console.log("Empty diff, did you git add anything?");
        process.exit(1);
    }
    let message = "";
    let tokens = 0;
    let cont = true;
    const provider = (0, ai_1.getProvider)(config);
    if (options.stripNoise) {
        console.log(`diff length: ${diff.length}`);
        const parsed = (0, git_1.parseDiff)(diff);
        const stripped = (0, git_1.stripNoiseFiles)(parsed);
        diff = (0, git_1.diffFilesToString)(stripped);
        console.log(`diff lenght ${diff.length}`);
    }
    let compressionLog;
    try {
        ({ diff, log: compressionLog } = await (0, git_1.compressDiffToLimit)(diff, config.max_diff_tokens, provider));
        compressionLog.forEach((log) => {
            console.log(log);
        });
    }
    catch (err) {
        if (err instanceof Error)
            console.log(err.message);
        else
            console.log(err);
        process.exit(1);
    }
    while (cont) {
        if (options.context) {
            const context = await (0, commandPrompts_1.typePrompt)("Enter context for generation");
            message = await provider.generateCommitMessage(diff, context);
        }
        else {
            message = await provider.generateCommitMessage(diff);
        }
        tokens += await provider.countInputTokens(diff);
        console.log("===========COMMIT MESSAGE===========");
        console.log(message);
        if (config.auto_commit) {
            await (0, git_1.commitWithRetry)(git_1.git, message);
            process.exit(1);
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
        (0, git_1.commitWithRetry)(git_1.git, message);
    }
    if (config.auto_push) {
        if (config.ask_origin)
            (0, git_1.pushChanges)(await (0, commandPrompts_1.remotePrompt)());
        else
            (0, git_1.pushChanges)(config.default_origin);
    }
    else if (await (0, commandPrompts_1.confirmContinue)("Would you like to Push Changes? y/n")) {
        if (!options.dryRun) {
            if (config.ask_origin)
                (0, git_1.pushChanges)(await (0, commandPrompts_1.remotePrompt)());
            else
                (0, git_1.pushChanges)(config.default_origin);
        }
    }
    console.log("===========TOKEN USAGE===========");
    console.log(`Total input token usage: ${tokens}`);
});
program.command("testparse")
    .description("Tests diff parser")
    .action(() => {
    console.log(testDiff_1.testDiff);
    console.log(JSON.stringify((0, git_1.parseDiff)(testDiff_1.testDiff), null, 2));
});
program.command("push")
    .description("Standalone push command")
    .action(async () => {
    console.log("Pushing Changes");
    const config = (0, config_1.loadConfig)();
    if (config.ask_origin)
        (0, git_1.pushChanges)(await (0, commandPrompts_1.remotePrompt)());
    else
        (0, git_1.pushChanges)(config.default_origin);
});
// fun comment
// ohmy god another fun comment
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
    (0, config_1.saveConfig)(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt, answers.autoCommit, answers.autoPush, answers.maxTokens, answers.defRemote, answers.askOrigin);
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
config.command("set [key] [value]")
    .description("Set Individual config values")
    .action(async (key, value) => {
    if (!key) {
        key = await (0, commandPrompts_1.configKeysPrompt)();
    }
    if (!value) {
        value = await (0, commandPrompts_1.configValuePrompt)(key);
    }
    (0, config_1.configSet)(key, value);
});
config.command("options")
    .description("List config options for usage in config set")
    .action(() => {
    Object.entries(config_1.CONFIG_OPTIONS).forEach(([key, value]) => {
        console.log(`${key}: \n\t${value.description}\n\tOptions: ${value.options}`);
    });
});
program.parse();
