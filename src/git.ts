import { execSync } from "child_process";
import path, { parse } from "path";
import simpleGit from "simple-git";
export const git = simpleGit();
import {AIProvider} from "./ai"
import { A } from "ollama/dist/shared/ollama.1bfa89da.cjs";


const AVG_TOKENS_PER_LINE: number = 10;


/* ---------------------------------------------------------------
 | getStagedDiff — returns the staged gif diff
 | args: None
 | returns: string
 --------------------------------------------------------------- */
export async function getStagedDiff() {

    try{
        const diff = await git.diff(['--staged']);
        return diff;
    } catch (err) {
        console.error("error getting diff")
        return "failure";
    }
}
/* ---------------------------------------------------------------
 | isGitRepo — returns t/f based on whether cli is running in git repo
 | args: none, 
 | returns: boolean
 --------------------------------------------------------------- */
export function isGitRepo(): boolean {

    try {
        execSync("git rev-parse --is-inside-work-tree", {
            stdio: "ignore",
        });

        return true;
    } catch {
        return false;
    }
}
/* ---------------------------------------------------------------
 | getRepoName — returns name of current repo
 | args: none
 | returns: string
 --------------------------------------------------------------- */
export function getRepoName(): string{

    try {
        const url = execSync("git remote get-url origin")
        .toString()
        .trim();

        return url;
    } catch {

    }

    try {
        const root = execSync("git rev-parse --show-toplevel")
        .toString()
        .trim();

        return path.basename(root);
    } catch {
        return "unknown repo";
    }


}
/* ---------------------------------------------------------------
 | getRemotes — returns list of git remotes
 | args: none
 | returns: string[]
 --------------------------------------------------------------- */
export function getRemotes(): string[]{
    const remotes = execSync("git remote", {encoding: "utf-8"})
    .split("\n")
    .map(r => r.trim())
    .filter(Boolean);

    return remotes;
}


/* ---------------------------------------------------------------
 | commit — commits staged changes with given message
 | args: message(string)
 | returns: none
 --------------------------------------------------------------- */
export async function commmit(message: string){

    try {
        await git.commit(message);
        console.log("Commit seccessful");
    } catch (err: any) {
        console.error('RAW ERROR:', err.message);
    if (err.message.includes('index.lock')) {
        console.error('✖ Git is locked by another process.')
        console.error('  Fix it by running: rm .git/index.lock')
        process.exit(1)
    }
    // handle other errors
    console.error('✖ Git error:', err.message)
    process.exit(1)
    }

}
/* ---------------------------------------------------------------
 | commitWithRetry — attempts to commit a given # of times with given delay in between attempts
 | args: git(SimpleGit), message(string), retries(number), delayMs(number)
 | returns: none
 --------------------------------------------------------------- */
export async function commitWithRetry(
  git: any, 
  message: string, 
  retries = 3,
  delayMs = 500
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await git.commit(message)
      return // success
    } catch (err: any) {
      const isLock = err.message.includes('index.lock') && err.message.includes('File exists')
      
      if (isLock && attempt < retries) {
        console.log(`⟳ Git locked, retrying (${attempt}/${retries})...`)
        await new Promise(res => setTimeout(res, delayMs))
        continue
      }

      // not a lock error, or out of retries
      if (isLock) {
        console.error('✖ Git is locked by another process.')
        console.error('  Fix it by running: rm .git/index.lock')
      } else {
        console.error('✖ Git error:', err.message)
      }
      process.exit(1)
    }
  }
}

/* ---------------------------------------------------------------
 | pushChanges — pushes changes to github repo given remote
 | args: remote(string)
 | returns: none
 --------------------------------------------------------------- */
export async function pushChanges(remote: string) {
    try {
        await git.push(remote);
        console.log("Push successful");
    } catch (err) {
        console.error("Push Failed");
    }
}


export interface DiffFile {
    filename: string
    block: string
    isDeleted: boolean
    isRenamed: boolean
    renamedFrom?: string
    renamedTo?: string
    changedLines: number,
    newHeader: boolean,
}

/* ---------------------------------------------------------------
 | compressDiffToLimit — driver function that takes a git diff 
 |                       and returns a diff compressed to token 
 |                       limit or max compression and a log.
 | args: diff(string), limit(number), provider(AIProvider)
 | returns: string
 --------------------------------------------------------------- */
export async function compressDiffToLimit(
    diff: string,
    limit: number,
    provider: AIProvider
): Promise<{diff: string; log: string[]}> {
    
    const log: string[] = [];
    let files: DiffFile[] = parseDiff(diff);

    //Strip Noise Files
    let currentTok = await provider.countInputTokens(diffFilesToString(files));
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit\nStripping Noise Files...`);
    } else {
        return {diff: diffFilesToString(files), log: log};
    }
    files = stripNoiseFiles(files);
    currentTok = await provider.countInputTokens(diffFilesToString(files));

    //Strip Header
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit\nStripping Headers...`);
    } else {
        return {diff: diffFilesToString(files), log: log};
    }
    files = stripHeader(files);
    currentTok = await provider.countInputTokens(diffFilesToString(files));

    //Strip Context
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit\nStripping Context Lines...`);
    } else {
        return {diff: diffFilesToString(files), log: log};
    }
    const Originalfiles = stripContextLines(files);
    currentTok = await provider.countInputTokens(diffFilesToString(files));

    //StripLines
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit\nTrimming Files Scaled to Limit...`);
    } else {
        return {diff: diffFilesToString(files), log: log};
    }

    let allocation = allocateLineLimits(files, limit, 15);
    files = stripLines(Originalfiles, allocation);
    currentTok = await provider.countInputTokens(diffFilesToString(files));
    let trimLimit = limit;

    while (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit\nTrimming Files More...`);
        trimLimit*=.7;
        allocation = allocateLineLimits(files, trimLimit, 5);
        files = stripLines(Originalfiles, allocation)
        currentTok = await provider.countInputTokens(diffFilesToString(files));
    }

    // Final Return Or Throw
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit`);
        throw new Error("Supported diff reduction methods cannot reduce diff below token limt.")
    } else {
        return {diff: diffFilesToString(files), log: log};
    }
    

}

/* ---------------------------------------------------------------
 | parseDiff — coverts diff (string) to an array of type DiffFile
 | args: diff(string)
 | returns: DiffFile[]
 --------------------------------------------------------------- */
export function parseDiff(diff: string): DiffFile[] {
    const files = diff.split(/(?=^diff --git )/m).filter(Boolean);
    const res: DiffFile[] = [];
    files.forEach((block) => {
        const file: DiffFile = {
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
        if (file.isRenamed){
            file.renamedTo = renameTo;
            file.renamedFrom = renameFrom;
        };

        file.changedLines = block
        .split('\n')
        .filter(line => /^[+-]/.test(line) && !/^(\+\+\+|---)/.test(line))
        .length;

        res.push(file)
    })
    return res;
}

const NOISE_PATTERNS: RegExp[] = [
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

]
/* ---------------------------------------------------------------
 | stripNoiseFiles — takes a DiffFile Array and remoces program 
 |                   noise files (non user generated)
 | args: diff(DiffFile[])
 | returns: DiffFile[]
 --------------------------------------------------------------- */
export function stripNoiseFiles(diff: DiffFile[]) {
    return diff.filter((file => !NOISE_PATTERNS.some(pattern => pattern.test(file.filename))))
}

export function stripContextLines(diff: DiffFile[]): DiffFile[] {
    return diff.map((diffFile) => ({
        ...diffFile,
        block: diffFile.block
            .replace(/^ [^\n]*\n?/gm, '')
            .replace(/\n{3,}/g, '\n\n'),  // back to 3+, not 2+
    }));
}


export function stripHeader(diff: DiffFile[]) {

    return diff.map((diffFile) => ({
        ...diffFile,
        newHeader: true,
        block: diffFile.block
            .replace(/^[\s\S]*?(?=^@@)/m, '')

    }))
}

export function allocateLineLimits(files: DiffFile[], totalTokenBudget: number, tokenFloor: number): Map<string, number> {
    const totalChangedLines = files.reduce((sum, f) => sum + f.changedLines, 0);
    const allocations = new Map<string, number>();

    for (const file of files) {
        const share = file.changedLines / totalChangedLines;

        const allocatedLines = Math.max(tokenFloor, Math.floor(share * totalTokenBudget / AVG_TOKENS_PER_LINE));
        allocations.set(file.filename, allocatedLines);
    }

    return allocations
}

export function stripLines(diff: DiffFile[], allocations:Map<string, number> ) {

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
        

        const head = lines.slice(0,headCut + 1);
        const tail = lines.slice(tailCut);
        const skipped = tailCut - headCut - 1;

        return {
            ...file,
            block: `${head.join('\n')}\n[... ${skipped} lines skipped ...]\n${tail.join('\n')}`
        }


    })

}

function buildFileHeader(file: DiffFile): string {
    if (file.isDeleted) return `${file.filename} [D]`;
    if (file.isRenamed) return `${file.filename} [R:${file.renamedFrom}]`;
    return file.filename;
}

/* ---------------------------------------------------------------
 | DiffFilesToString — converts array of diff files to cont. string
 | args: files(DiffFile[])
 | returns: string
 --------------------------------------------------------------- */
export function diffFilesToString(files: DiffFile[]): string {
    return files
        .map(f => {
            const block = f.newHeader
                ? `${buildFileHeader(f)}\n${f.block.trimEnd()}`
                : f.block.trimEnd();
            return block;
        })
        .join("\n\n");
}

//fun comment