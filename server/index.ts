import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { prisma } from "./config/db";
import { env } from "./config/env";
import { Prisma } from "./generated/prisma/client";
import authRouter from "./routers/authRouter";

const app = express();

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/v1/auth", authRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Express 5 forwards rejected promises from async handlers here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ message: "A record with that value already exists" });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

async function start() {
  await prisma.$connect();
  console.log("Connected to PostgreSQL");
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

start().catch(async (err) => {
  console.error("Failed to start server:", err);
  await prisma.$disconnect();
  process.exit(1);
});
