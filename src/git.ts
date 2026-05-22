import { execSync } from "child_process";
import path from "path";
import simpleGit from "simple-git";
export const git = simpleGit();

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

export async function pushChanges() {
    try {
        await git.push();
        console.log("Push successful");
    } catch (err) {
        console.error("Push Failed");
    }
}