"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStagedDiff = getStagedDiff;
exports.isGitRepo = isGitRepo;
exports.getRepoName = getRepoName;
exports.commmit = commmit;
exports.pushChanges = pushChanges;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const git = (0, simple_git_1.default)();
async function getStagedDiff() {
    try {
        const diff = await git.diff();
        return diff;
    }
    catch (err) {
        console.error("error getting diff");
        return "failure";
    }
}
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
function getRepoName() {
    try {
        const url = (0, child_process_1.execSync)("git remote get-url origin")
            .toString()
            .trim();
        return url;
    }
    catch {
    }
    try {
        const root = (0, child_process_1.execSync)("git rev-parse --show-toplevel")
            .toString()
            .trim();
        return path_1.default.basename(root);
    }
    catch {
        return "unknown repo";
    }
}
async function commmit(message) {
    try {
        await git.add(".");
        await git.commit(message);
        console.log("Commit seccessful");
    }
    catch (err) {
        console.error("Commit failed");
        console.log(err);
        //comment just to make diff not empty
    }
}
async function pushChanges() {
    try {
        await git.push();
        console.log("Push successful");
    }
    catch (err) {
        console.error("Push Failed");
    }
}
