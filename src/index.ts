#!/usr/bin/env node

import { getStagedDiff, isGitRepo, getRepoName } from "./git";

async function main(){
    const command = process.argv[2];

    if (isGitRepo())
        console.log("Current repo:" + getRepoName());
    else {
        console.log("Not in git repo");
    }
    switch (command) {

        case "diff":
            await getStagedDiff();
            break;
        default:
            console.log("Unknown Command");
    }

}

main();