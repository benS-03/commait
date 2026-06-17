
import { readFileSync } from "node:fs"
import path from "path";
import {stripNoiseFiles,stripLines , allocateLineLimits,stripHeader,stripContextLines,parseDiff, DiffFile, diffFilesToString} from "../src/git"
import {describe, it, expect} from "vitest"

const noiseDiff = readFileSync(
    path.join(__dirname, "fixtures/noise-diff.txt"),"utf-8"
);

const contextDiff = readFileSync(
    path.join(__dirname, "fixtures/context-diff.txt"),"utf-8"
);

const contextDiffTest = readFileSync(
    path.join(__dirname, "fixtures/context-diff-success.txt"),"utf-8"
);

const headerDiffTest = readFileSync(
    path.join(__dirname, "fixtures/header-diff-success.txt"),"utf-8"
);

const lineStrip = readFileSync(
    path.join(__dirname, "fixtures/line-strip-diff.txt"),"utf-8"
);

const lineStripTest = readFileSync(
    path.join(__dirname, "fixtures/line-strip-test.txt"),"utf-8"
);

describe("gitDiffReduction", () => {

    it("Strip Noise removes correct files", () => {
        
        const parsed: DiffFile[] = parseDiff(noiseDiff);
        const stripped = stripNoiseFiles(parsed);
        const res = stripped.length;
        expect(res).toBe(0);
    })

    it("Strip context remove all context lines", () => {
        const parsed: DiffFile[] = parseDiff(contextDiff);
        const stripped = stripContextLines(parsed);
        const res = diffFilesToString(stripped);
        expect(res).toBe(contextDiffTest)
    })

    it("Strip the headers and insert more succint header", () => {
        const parsed: DiffFile[] = parseDiff(contextDiff);
        const stripped = stripHeader(parsed);
        const res = diffFilesToString(stripped);
        expect(res).toBe(headerDiffTest);
    })

    it("Strip lines from the middle of file based on limit", () => {
        const parsed: DiffFile[] = parseDiff(lineStrip);
        const headerStrip = stripHeader(parsed);
        const allocation: Map<string, number> = allocateLineLimits(headerStrip, 500, 20);
        const stripped = stripLines(headerStrip, allocation);
        const res = diffFilesToString(stripped);
        expect(res).toBe(lineStripTest);
    })

})