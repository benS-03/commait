"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffCompressionError = exports.GitError = exports.AiProviderError = exports.NoDiffError = exports.ConfigError = exports.CommaitError = void 0;
class CommaitError extends Error {
    constructor(message, exitCode = 1) {
        super(message);
        this.exitCode = exitCode;
        this.name = "CommmaitError";
    }
}
exports.CommaitError = CommaitError;
class ConfigError extends CommaitError {
    constructor(message) {
        super(message, 2);
        this.name = "ConfigError";
    }
}
exports.ConfigError = ConfigError;
class NoDiffError extends CommaitError {
    constructor(message = "No staged changes to commit") {
        super(message, 3);
        this.name = "NoDiffError";
    }
}
exports.NoDiffError = NoDiffError;
class AiProviderError extends CommaitError {
    constructor(message) {
        super(message, 4);
        this.name = "ProviderError";
    }
}
exports.AiProviderError = AiProviderError;
class GitError extends CommaitError {
    constructor(message) {
        super(message, 5);
        this.name = "GitError";
    }
}
exports.GitError = GitError;
class DiffCompressionError extends CommaitError {
    constructor(message) {
        super(message, 6);
        this.name = "DiffCompressionError";
    }
}
exports.DiffCompressionError = DiffCompressionError;
