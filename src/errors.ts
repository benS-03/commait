

export class CommaitError extends Error {
    constructor(message: string, public readonly exitCode: number = 1){
        super(message);
        this.name = "CommmaitError";
    }
}


export class ConfigError extends CommaitError {
    constructor(message: string) {
        super(message, 2);
        this.name = "ConfigError";
    }
}

export class NoDiffError extends CommaitError {
    constructor(message: string = "No staged changes to commit") {
        super (message, 3);
        this.name = "NoDiffError"
    }
}

export class AiProviderError extends CommaitError {
    constructor(message: string) {
        super(message, 4);
        this.name = "ProviderError"
    }
}

export class GitError extends CommaitError {
    constructor(message: string) {
        super(message, 5);
        this.name = "GitError"
    }
}

export class DiffCompressionError extends CommaitError{
    constructor(message: string){
        super(message, 6);
        this.name = "DiffCompressionError";
    }
}