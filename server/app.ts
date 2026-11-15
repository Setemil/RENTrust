import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { Prisma } from "./generated/prisma/client";
import routes from "./routes";
import { requestContext, withRequestContext } from "./shared/context";
import { env } from "./shared/env";
import { HttpError } from "./shared/errors";
import { isToastStatus, toast } from "./shared/toast";

// The Express app: request setup, the routes, then error handling. index.ts starts it.
export const app = express();

app.use(withRequestContext);
app.use(cors({ origin: env.clientUrl, credentials: true, exposedHeaders: ["X-Request-Id"] }));
app.use(express.json());
// BigInt columns (audit and history seq) can't go through JSON.stringify; send them as strings.
app.set("json replacer", (_key: string, value: unknown) => (typeof value === "bigint" ? value.toString() : value));

app.use("/api/v1", routes);

// Every error leaves in one shape: { error: { code, message, requestId } }, plus a toast for
// the web app when the error isn't a form problem (see shared/toast.ts).
function sendError(res: Response, status: number, code: string, message: string) {
  const requestId = requestContext()?.requestId ?? null;
  const reference = status >= 500 ? requestId?.slice(0, 8) : undefined;
  res.status(status).json({
    error: { code, message, requestId },
    ...(isToastStatus(status) ? { toast: toast.error(message, reference) } : {}),
  });
}

app.use((_req, res) => {
  sendError(res, 404, "NOT_FOUND", "Not found");
});

// Anything a handler throws (or rejects with) lands here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return sendError(res, err.status, err.code, err.message);
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return sendError(res, 409, "DUPLICATE", "A record with that value already exists");
  }
  if (err instanceof SyntaxError && "body" in err) {
    return sendError(res, 400, "MALFORMED_JSON", "Malformed JSON body");
  }
  console.error(`[${requestContext()?.requestId ?? "-"}]`, err);
  sendError(res, 500, "INTERNAL", "Something went wrong on our side. Try again, and quote the reference if you contact support.");
});
