"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.git = void 0;
exports.getStagedDiff = getStagedDiff;
exports.isGitRepo = isGitRepo;
exports.getRemotes = getRemotes;
exports.stageAll = stageAll;
exports.commitWithRetry = commitWithRetry;
exports.pushChanges = pushChanges;
exports.compressDiffToLimit = compressDiffToLimit;
exports.parseDiff = parseDiff;
exports.stripNoiseFiles = stripNoiseFiles;
exports.stripContextLines = stripContextLines;
exports.stripHeader = stripHeader;
exports.allocateLineLimits = allocateLineLimits;
exports.stripLines = stripLines;
exports.diffFilesToString = diffFilesToString;
const child_process_1 = require("child_process");
const simple_git_1 = __importDefault(require("simple-git"));
exports.git = (0, simple_git_1.default)();
const errors_1 = require("./errors");
const ora_1 = __importDefault(require("ora"));
const AVG_TOKENS_PER_LINE = 10;
const MAX_TRIM_ITERATIONS = 6;
const NOISE_PATTERNS = [
    //Lock Files
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /Gemfile\.lock$/,
    /poetry\.lock$/,
    /Pipfile\.lock$/,
    /composer\.lock$/,
    /[Cc]ar[gG]o\.lock$/,
    /packages\.lock\.json$/,
    /pubspec\.lock$/,
    // Build output
    /^dist\//,
    /^build\//,
    /^out\//,
    /^\.next\//,
    /^\.nuxt\//,
    /^\.output\//,
    /^coverage\//,
    /^\.nyc_output\//,
    /^__pycache__\//,
    /^\.cache\//,
    /^target\//,
    /^bin\//,
    /^obj\//,
    // Minified
    /\.min\.js$/,
    /\.min\.css$/,
    /\.bundle\.js$/,
    /\.chunk\.js$/,
    // Generated code
    /\.pb\.go$/,
    /\.pb\.swift$/,
    /_pb2\.py$/,
    /\.generated\./,
    /graphql\.schema\.json$/,
    /openapi\.json$/,
    /swagger\.json$/,
    // Source maps
    /\.map$/,
    // Binary/media
    /\.(png|jpg|jpeg|gif|webp|ico)$/,
    /\.(mp4|mp3|wav|ogg|webm)$/,
    /\.(pdf|doc|docx|xls|xlsx)$/,
    /\.(zip|tar|gz|rar|7z)$/,
    /\.(ttf|woff|woff2|eot)$/,
    // IDE/OS
    /\.DS_Store$/,
    /Thumbs\.db$/,
    /\.idea\//,
    // Snapshots
    /__snapshots__\//,
    /\.snap$/,
    // Changelogs
    /changelog\.md$/i,
];
/* ---------------------------------------------------------------
 | getStagedDiff — returns the staged gif diff
 | args: None
 | returns: string
 --------------------------------------------------------------- */
async function getStagedDiff() {
    try {
        const diff = await exports.git.diff(['--staged']);
        if (diff == "") {
            throw new errors_1.GitError("Diff is empty. Did you stage your changed files?");
        }
        return diff;
    }
    catch (err) {
        throw new errors_1.GitError(`Failed to get staged diff: ${err.message}`);
    }
}
/* ---------------------------------------------------------------
 | isGitRepo — returns t/f based on whether cli is running in git repo
 | args: none,
 | returns: boolean
 --------------------------------------------------------------- */
function isGitRepo() {
    try {
        (0, child_process_1.execSync)("git rev-parse --is-inside-work-tree", {
            stdio: "ignore",
        });
        return true;
    }
    catch {
        return false;
    }
}
/* ---------------------------------------------------------------
 | getRemotes — returns list of git remotes
 | args: none
 | returns: string[]
 --------------------------------------------------------------- */
function getRemotes() {
    try {
        const remotes = (0, child_process_1.execSync)("git remote", { encoding: "utf-8" })
            .split("\n")
            .map(r => r.trim())
            .filter(Boolean);
        return remotes;
    }
    catch (err) {
        throw new errors_1.GitError(`Failed to get list of remotes: ${err.message}`);
    }
}
/* ---------------------------------------------------------------
 | stageAll — stages all changes to git.
 | args: none
 | returns: none
 --------------------------------------------------------------- */
async function stageAll() {
    try {
        await exports.git.add("-A");
    }
    catch (err) {
        throw new errors_1.GitError(`Failed to stage changes: ${err.message}`);
    }
}
/* ---------------------------------------------------------------
 | commitWithRetry — attempts to commit a given # of times with given delay in between attempts
 | args: git(SimpleGit), message(string), retries(number), delayMs(number)
 | returns: none
 --------------------------------------------------------------- */
async function commitWithRetry(git, message, retries = 3, delayMs = 500) {
    const spinner = (0, ora_1.default)({
        text: "Commiting Locally",
        spinner: "flip",
        color: "green"
    }).start();
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await git.commit(message);
            spinner.succeed("Changes Commited Locally.");
            return; // success
        }
        catch (err) {
            const isLock = err.message.includes('index.lock') && err.message.includes('File exists');
            if (isLock && attempt < retries) {
                console.log(`⟳ Git locked, retrying (${attempt}/${retries})...`);
                await new Promise(res => setTimeout(res, delayMs));
                continue;
            }
            // not a lock error, or out of retries
            if (isLock) {
                spinner.fail("Failed to commit locally");
                throw new errors_1.GitError(`Git is locked by another process. Retried ${retries} times before exiting.`);
            }
            else {
                spinner.fail("Failed to commit locally");
                throw new errors_1.GitError(`Failed to commit: ${err.message}`);
            }
        }
    }
}
/* ---------------------------------------------------------------
 | pushChanges — pushes changes to github repo given remote
 | args: remote(string)
 | returns: none
 --------------------------------------------------------------- */
async function pushChanges(remote) {
    const spinner = (0, ora_1.default)({
        text: "Pushing Local Commit",
        spinner: "flip",
        color: "green"
    }).start();
    try {
        await exports.git.push(remote);
        spinner.succeed("Changes Successfully Pushed");
    }
    catch (err) {
        spinner.fail("Failed to push changes.");
        throw new errors_1.GitError(`Failed to push changes: ${err.message}`);
    }
}
/* ---------------------------------------------------------------
 | compressDiffToLimit — driver function that takes a git diff
 |                       and returns a diff compressed to token
 |                       limit or max compression and a log.
 | args: diff(string), limit(number), provider(AIProvider)
 | returns: string
 --------------------------------------------------------------- */
async function compressDiffToLimit(diff, limit, provider) {
    const log = [];
    let files = parseDiff(diff);
    const spinner = (0, ora_1.default)({
        text: "Compressing diff below token budget",
        spinner: "flip",
        color: "green"
    }).start();
    //Strip Noise Files
    let currentTok = await provider.countInputTokens(diffFilesToString(files));
    if (currentTok > limit) {
        spinner.info(`${currentTok - limit} tokens over budget. Stripping Noise Files...`);
    }
    else {
        spinner.succeed("Compression Successful");
        return { diff: diffFilesToString(files), log: log };
    }
    files = stripNoiseFiles(files);
    currentTok = await provider.countInputTokens(diffFilesToString(files));
    //Strip Header
    if (currentTok > limit) {
        spinner.info(`${currentTok - limit} tokens over budget. Stripping Headers...`);
    }
    else {
        spinner.succeed("Compression Successful");
        return { diff: diffFilesToString(files), log: log };
    }
    files = stripHeader(files);
    currentTok = await provider.countInputTokens(diffFilesToString(files));
    //Strip Context
    if (currentTok > limit) {
        spinner.info(`${currentTok - limit} tokens over budget. Stripping Context Lines...`);
    }
    else {
        spinner.succeed("Compression Successful");
        return { diff: diffFilesToString(files), log: log };
    }
    const Originalfiles = stripContextLines(files);
    currentTok = await provider.countInputTokens(diffFilesToString(files));
    //StripLines
    if (currentTok > limit) {
        spinner.info(`${currentTok - limit} tokens over budget. Trimming Files Scaled to Limit...`);
    }
    else {
        spinner.succeed("Compression Successful");
        return { diff: diffFilesToString(files), log: log };
    }
    let allocation = allocateLineLimits(files, limit, 15);
    files = stripLines(Originalfiles, allocation);
    currentTok = await provider.countInputTokens(diffFilesToString(files));
    let trimLimit = limit;
    let lastExcess = Infinity;
    //Strip Lines loop to approach limit
    let iterations = 0;
    while (currentTok > limit && iterations < MAX_TRIM_ITERATIONS) {
        const excess = currentTok - limit;
        if (excess >= lastExcess)
            break;
        lastExcess = excess;
        spinner.info(`${currentTok - limit} tokens over budget. Trimming Files More...`);
        trimLimit *= .7;
        allocation = allocateLineLimits(files, trimLimit, 5);
        files = stripLines(Originalfiles, allocation);
        currentTok = await provider.countInputTokens(diffFilesToString(files));
    }
    // Final Return Or Throw
    if (currentTok > limit) {
        spinner.fail(`Compression Failed`);
        throw new errors_1.DiffCompressionError("Unable to compress diff below limit with supported methods.");
    }
    else {
        spinner.succeed("Compression Successful");
        return { diff: diffFilesToString(files), log: log };
    }
}
/* ---------------------------------------------------------------
 | parseDiff — coverts diff (string) to an array of type DiffFile
 | args: diff(string)
 | returns: DiffFile[]
 --------------------------------------------------------------- */
function parseDiff(diff) {
    const files = diff.split(/(?=^diff --git )/m).filter(Boolean);
    const res = [];
    files.forEach((block) => {
        const file = {
            filename: "",
            block: "",
            isDeleted: false,
            isRenamed: false,
            renamedFrom: "",
            renamedTo: "",
            changedLines: 0,
            newHeader: false
        };
        file.filename = block.match(/^diff --git a\/.+b\/(.+)$/m)?.[1] ?? "";
        file.block = block;
        file.isDeleted = /^deleted file mode/m.test(block);
        const renameFrom = block.match(/^rename from (.+)$/m)?.[1];
        const renameTo = block.match(/^rename to (.+)$/m)?.[1];
        file.isRenamed = renameFrom !== undefined && renameTo !== undefined;
        if (file.isRenamed) {
            file.renamedTo = renameTo;
            file.renamedFrom = renameFrom;
        }
        ;
        file.changedLines = block
            .split('\n')
            .filter(line => /^[+-]/.test(line) && !/^(\+\+\+|---)/.test(line))
            .length;
        res.push(file);
    });
    return res;
}
/* ---------------------------------------------------------------
 | stripNoiseFiles — takes a DiffFile Array and remoces program
 |                   noise files (non user generated)
 | args: diff(DiffFile[])
 | returns: DiffFile[]
 --------------------------------------------------------------- */
function stripNoiseFiles(diff) {
    return diff.filter((file => !NOISE_PATTERNS.some(pattern => pattern.test(file.filename))));
}
function stripContextLines(diff) {
    return diff.map((diffFile) => ({
        ...diffFile,
        block: diffFile.block
            .replace(/^ [^\n]*\n?/gm, '')
            .replace(/\n{3,}/g, '\n\n'), // back to 3+, not 2+
    }));
}
/* ---------------------------------------------------------------
 | sttripHeader — takes a diffFile array and strips the header
                  from each individual file. Marks the newHeader
                  flag true so string generration generates a
                  succint header.
 | args: diff(DiffFile[])
 | returns: DiffFile[]
 --------------------------------------------------------------- */
function stripHeader(diff) {
    return diff.map((diffFile) => ({
        ...diffFile,
        newHeader: true,
        block: diffFile.block
            .replace(/^[\s\S]*?(?=^@@)/m, '')
    }));
}
/* ---------------------------------------------------------------
 | allocateLineLimits — Helper function for strip lines. Generates
                        a map that maps strings to a amount of lines
                        it is alloicated. This is generated based
                        on the token limit and the file size
 | args: diff(DiffFile[]), totalTokenBudget: number, tokenFloor: number
 | returns: Map<string, number>
 --------------------------------------------------------------- */
function allocateLineLimits(files, totalTokenBudget, tokenFloor) {
    const totalChangedLines = files.reduce((sum, f) => sum + f.changedLines, 0);
    const allocations = new Map();
    for (const file of files) {
        const share = file.changedLines / totalChangedLines;
        const allocatedLines = Math.max(tokenFloor, Math.floor(share * totalTokenBudget / AVG_TOKENS_PER_LINE));
        allocations.set(file.filename, allocatedLines);
    }
    return allocations;
}
/* ---------------------------------------------------------------
 | stripLines — takes a array of diff files and an allocation map,
                (see above) strip lines from the middle of each
                file according the the allocation map.
 | args: diff(DiffFile[]), allocations(Map<string,number>)
 | returns: DiffFile[]
 --------------------------------------------------------------- */
function stripLines(diff, allocations) {
    return diff.map(file => {
        const lines = file.block.split('\n');
        const allocated = allocations.get(file.filename) ?? 0;
        const keepHead = Math.ceil(allocated * 0.6);
        const keepTail = Math.floor(allocated * 0.4);
        let changedSeen = 0;
        let headCut = 0;
        for (let i = 0; i < lines.length; i++) {
            if (/^[+-]/.test(lines[i]) && !/^(\+\+\+|---)/.test(lines[i])) {
                changedSeen++;
            }
            if (changedSeen >= keepHead) {
                headCut = i;
                break;
            }
        }
        changedSeen = 0;
        let tailCut = lines.length - 1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (/^[+-]/.test(lines[i]) && !/^(\+\+\+|---)/.test(lines[i])) {
                changedSeen++;
            }
            if (changedSeen >= keepTail) {
                tailCut = i;
                break;
            }
        }
        const head = lines.slice(0, headCut + 1);
        const tail = lines.slice(tailCut);
        const skipped = tailCut - headCut - 1;
        return {
            ...file,
            block: `${head.join('\n')}\n[... ${skipped} lines skipped ...]\n${tail.join('\n')}`
        };
    });
}
/* ---------------------------------------------------------------
 | buildFileHeader — takes a diffFile and creates returns a
                     replacement header for a diff.
 | args: diff(DiffFile[])
 | returns: string
 --------------------------------------------------------------- */
function buildFileHeader(file) {
    if (file.isDeleted)
        return `${file.filename} [D]`;
    if (file.isRenamed)
        return `${file.filename} [R:${file.renamedFrom}]`;
    return file.filename;
}
/* ---------------------------------------------------------------
 | DiffFilesToString — converts array of diff files to cont. string
 | args: files(DiffFile[])
 | returns: string
 --------------------------------------------------------------- */
function diffFilesToString(files) {
    return files
        .map(f => {
        const block = f.newHeader
            ? `${buildFileHeader(f)}\n${f.block.trimEnd()}`
            : f.block.trimEnd();
        return block;
    })
        .join("\n\n");
}
