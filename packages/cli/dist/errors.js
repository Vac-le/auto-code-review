export class CliError extends Error {
    exitCode;
    code;
    constructor(message, options = {}) {
        super(message, { cause: options.cause });
        this.name = "CliError";
        this.exitCode = options.exitCode ?? 2;
        this.code = options.code ?? "CLI_ERROR";
    }
}
export function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
//# sourceMappingURL=errors.js.map