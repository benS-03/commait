import { execSync } from "child_process";
import path, { parse } from "path";
import simpleGit from "simple-git";
export const git = simpleGit();
import {AIProvider} from "./ai"

export async function getStagedDiff() {

    try{
        const diff = await git.diff(['--staged']);
        return diff;
    } catch (err) {
        console.error("error getting diff")
        return "failure";
    }
}

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

export function getRemotes(): string[]{
    const remotes = execSync("git remote", {encoding: "utf-8"})
    .split("\n")
    .map(r => r.trim())
    .filter(Boolean);

    return remotes;
}

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
    changedLines: number
}

export async function compressDiffToLimit(
    diff: string,
    limit: number,
    provider: AIProvider
): Promise<{diff: string; log: string[]}> {
    
    const log: string[] = [];
    const files: DiffFile[] = parseDiff(diff);

    //Strip Noise Files
    let currentTok = await provider.countInputTokens(diffFilesToString(files));
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit`);
    } else {
        return {diff: diffFilesToString(files), log: log};
    }
    const strippedFiles = stripNoiseFiles(files);
    log.push("Stripped Noise Files from diff.")

    currentTok = await provider.countInputTokens(diffFilesToString(strippedFiles));
    if (currentTok > limit) {
        console.log(`Diff is ${currentTok-limit} tokens greater than token limit`);
        throw new Error("Supported diff reduction methods cannot reduce diff below token limt.")
    } else {
        return {diff: diffFilesToString(strippedFiles), log: log};
    }
    

}

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
            changedLines: 0
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

export function stripNoiseFiles(diff: DiffFile[]) {
    return diff.filter((file => !NOISE_PATTERNS.some(pattern => pattern.test(file.filename))))
}

export function diffFilesToString(files: DiffFile[]): string {
  return files
    .map(f => f.block.trim())
    .join("\n\n");
}

//fun comment