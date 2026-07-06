export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export function readableError(error: unknown): string {
  if (error instanceof UserFacingError) {
    return error.message;
  }

  if (error instanceof Error) {
    return `Något oväntat gick fel: ${error.message}`;
  }

  return "Något oväntat gick fel.";
}
