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
const aiPrompt_1 = require("./aiPrompt");
const commandPrompts_1 = require("./commandPrompts");
const external_editor_1 = require("@inquirer/external-editor");
const package_json_1 = __importDefault(require("../package.json"));
const errors_1 = require("./errors");
process.on('SIGINT', () => {
    console.log('\nAborted.');
    process.exit(0);
});
process.env.DOTENVX_QUIET = 'true';
const program = new commander_1.Command();
program.name("commait").description("AI-powered commit message generator").version(package_json_1.default.version);
// ======= COMMIT COMMANDS =======
program.command("commit")
    .description("Generate Message, commit locally, and optionally push changes")
    .option('--dry-run', 'run without commit or pushing')
    .option('-e, --edit', 'edit message before commit')
    .option('-c, --context', 'allows addition of further context')
    .option("--verbose", 'shows total token usage at end of commit')
    .action(async (options) => {
    //======= Data Loading, Variable Initialization =======
    const config = (0, config_1.loadConfig)();
    let message = "";
    let tokens = 0;
    let cont = true;
    if (config.auto_stage) {
        try {
            await (0, git_1.stageAll)();
        }
        catch (err) {
            if (err instanceof errors_1.CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
            else {
                console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
                process.exit(1);
            }
        }
    }
    let diff = "";
    try {
        diff = await (0, git_1.getStagedDiff)();
    }
    catch (err) {
        if (err instanceof errors_1.CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
        else {
            console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
        }
    }
    const provider = (0, ai_1.getProvider)(config);
    //fun comment
    //======= Pre Generation diff compression =======
    //Compression
    let compressionLog;
    try {
        ({ diff, log: compressionLog } = await (0, git_1.compressDiffToLimit)(diff, config.max_diff_tokens, provider));
        compressionLog.forEach((log) => {
            console.log(log);
        });
    }
    catch (err) {
        if (err instanceof errors_1.CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
        else {
            console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
        }
    }
    //fun comment
    // ======= Main commit loop =======
    while (cont) {
        // Message generation with optional context
        if (options.context) {
            const context = await (0, commandPrompts_1.typePrompt)("Enter context for generation");
            let message = "";
            try {
                message = await provider.generateCommitMessage(diff, context);
            }
            catch (err) {
                if (err instanceof errors_1.CommaitError) {
                    console.error(`commait: ${err.message}`);
                    process.exit(err.exitCode);
                }
                else {
                    console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
                    process.exit(1);
                }
            }
        }
        else {
            try {
                message = await provider.generateCommitMessage(diff);
            }
            catch (err) {
                if (err instanceof errors_1.CommaitError) {
                    console.error(`commait: ${err.message}`);
                    process.exit(err.exitCode);
                }
                else {
                    console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
                    process.exit(1);
                }
            }
        }
        // Token tracking and response loggin ( needs work)
        tokens += await provider.countInputTokens(diff);
        console.log("===========COMMIT MESSAGE===========");
        console.log(message);
        // Auto commit
        if (config.auto_commit) {
            if (!options.dryRun)
                try {
                    await (0, git_1.commitWithRetry)(git_1.git, message);
                    cont = false;
                }
                catch (err) {
                    if (err instanceof errors_1.CommaitError) {
                        console.error(`commait: ${err.message}`);
                        process.exit(err.exitCode);
                    }
                    else {
                        console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
                        process.exit(1);
                    }
                }
            else {
                cont = false;
            }
        }
        else {
            //Prompt to commit or regenerate
            const answer = await (0, commandPrompts_1.confirmCommit)();
            // Flag logic for regeneration
            if (answer.commitConfirm == 'y')
                cont = false;
            else if (answer.commitConfirm == 'r')
                cont = true;
            else
                process.exit(0);
        }
    }
    // ======= Optional Editing and Other =======
    //Editing of commmit
    if (options.edit) {
        message = (0, external_editor_1.edit)(message);
    }
    // Pushing flow with auto and manual
    if (config.auto_push) {
        let remote = config.default_origin;
        if (config.ask_origin) {
            remote = await (0, commandPrompts_1.remotePrompt)();
        }
        try {
            await (0, git_1.pushChanges)(config.default_origin);
        }
        catch (err) {
            if (err instanceof errors_1.CommaitError) {
                console.error(`commait: ${err.message}`);
                process.exit(err.exitCode);
            }
            else {
                console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
                process.exit(1);
            }
        }
    }
    else if (await (0, commandPrompts_1.ynListPrompt)("Would you like to push changes?")) {
        if (!options.dryRun) {
            let remote = config.default_origin;
            if (config.ask_origin)
                remote = await (0, commandPrompts_1.remotePrompt)();
            try {
                await (0, git_1.pushChanges)(config.default_origin);
            }
            catch (err) {
                if (err instanceof errors_1.CommaitError) {
                    console.error(`commait: ${err.message}`);
                    process.exit(err.exitCode);
                }
                else {
                    console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
                    process.exit(1);
                }
            }
        }
    }
    if (options.verbose) {
        console.log("===========TOKEN USAGE===========");
        console.log(`Total input token usage: ${tokens}`);
    }
});
// ======= Push Commands =======
program.command("push")
    .description("Standalone push command")
    .action(async () => {
    console.log("Pushing Changes");
    const config = (0, config_1.loadConfig)();
    // auto remote or not.
    let remote = config.default_origin;
    if (config.ask_origin)
        remote = await (0, commandPrompts_1.remotePrompt)();
    try {
        await (0, git_1.pushChanges)(config.default_origin);
    }
    catch (err) {
        if (err instanceof errors_1.CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
        else {
            console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
        }
    }
});
// ======= Config Commands =======
const config = program.command("config");
// ======= Initialize Config Command =======
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
    (0, config_1.saveConfig)(answers.provider, answers.openaiModel ?? answers.anthropicModel, prompt, answers.autoStage, answers.autoCommit, answers.autoPush, answers.maxTokens, answers.defRemote, answers.askOrigin);
});
// ======= Get user Config Command =======
config.command("get")
    .description("Display current config")
    .action(async () => {
    const config = await (0, config_1.loadConfig)();
    console.log(config);
});
// ======= Get Filepath to Config =======
config.command("loc")
    .description("Dispay path to config")
    .action(async () => {
    console.log("Path to config: " + config_1.CONFIG_PATH);
});
// ======= Set specific values in config =======
config.command("set [key]")
    .description("Set Individual config values")
    .action(async (key) => {
    if (!key) {
        key = await (0, commandPrompts_1.configKeysPrompt)();
    }
    let value;
    try {
        value = await (0, commandPrompts_1.configValuePrompt)(key);
    }
    catch (err) {
        if (err instanceof errors_1.CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
        else {
            console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
        }
    }
    try {
        (0, config_1.configSet)(key, value);
    }
    catch (err) {
        if (err instanceof errors_1.CommaitError) {
            console.error(`commait: ${err.message}`);
            process.exit(err.exitCode);
        }
        else {
            console.error(`commait: unexpected error — ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
        }
    }
});
// ======= Display All Config Keys =======
config.command("options")
    .description("List config options for usage in config set")
    .action(() => {
    Object.entries(config_1.CONFIG_OPTIONS).forEach(([key, value]) => {
        console.log(`${key}: \n\t${value.description}\n\tOptions: ${value.options}`);
    });
});
program.parse();
