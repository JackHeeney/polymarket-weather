type LogContext = Record<string, unknown>;

const now = (): string => new Date().toISOString();

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(JSON.stringify({ level: "info", at: now(), message, context }));
  },
  warn(message: string, context?: LogContext): void {
    console.warn(JSON.stringify({ level: "warn", at: now(), message, context }));
  },
  error(message: string, context?: LogContext): void {
    console.error(JSON.stringify({ level: "error", at: now(), message, context }));
  }
};
