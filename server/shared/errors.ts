// Errors a handler can throw. app.ts turns each one into
// { error: { code, message, requestId } } with the right HTTP status.
//
//   throw notFound("Property not found");
//   throw conflict("Already confirmed");
//
// `code` is for programs (the web app can branch on it); `message` is for people.

const DEFAULT_CODES: Record<number, string> = {
  400: "VALIDATION_FAILED",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
};

export class HttpError extends Error {
  public code: string;

  constructor(
    public status: number,
    message: string,
    code?: string,
  ) {
    super(message);
    this.code = code ?? DEFAULT_CODES[status] ?? "ERROR";
  }
}

export const badRequest = (message: string, code?: string) => new HttpError(400, message, code);
export const unauthorized = (message = "Authentication required", code?: string) => new HttpError(401, message, code);
export const forbidden = (message = "You don't have access to this", code?: string) => new HttpError(403, message, code);
export const notFound = (message = "Not found", code?: string) => new HttpError(404, message, code);
export const conflict = (message: string, code?: string) => new HttpError(409, message, code);
