import { execSync } from "child_process";
import path from "path";
import simpleGit from "simple-git";
const git = simpleGit();

export async function getStagedDiff() {

    try{
        const diff = await git.diff();
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
        await git.add(".");
        await git.commit(message);
        console.log("Commit seccessful");
    } catch (err) {
        console.error("Commit failed");
        console.log(err);
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