
import { readFileSync } from "node:fs"
import path from "path";
import {stripNoiseFiles, parseDiff, DiffFile} from "../src/git"
import {describe, it, expect} from "vitest"

const noiseDiff = readFileSync(
    path.join(__dirname, "fixtures/noise-diff.txt"),"utf-8"
);

describe("gitDiffReduction", () => {

    it("Strip Noise removes correct files", () => {
        
        const parsed: DiffFile[] = parseDiff(noiseDiff);
        const stripped = stripNoiseFiles(parsed);
        const res = stripped.length;
        expect(res).toBe(0);
    })

})