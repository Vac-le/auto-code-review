export class CliError extends Error {
  readonly exitCode: number;
  readonly code: string;

  constructor(message: string, options: { exitCode?: number; code?: string; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "CliError";
    this.exitCode = options.exitCode ?? 2;
    this.code = options.code ?? "CLI_ERROR";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
