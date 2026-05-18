#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const git_1 = require("./git");
async function main() {
    const command = process.argv[2];
    if ((0, git_1.isGitRepo)())
        console.log("Current repo:" + (0, git_1.getRepoName)());
    else {
        console.log("Not in git repo");
    }
    switch (command) {
        case "diff":
            await (0, git_1.getStagedDiff)();
            break;
        default:
            console.log("Unknown Command");
    }
}
main();
