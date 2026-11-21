import { app } from "./app";
import { resumePendingReports } from "./features/interests/reportProvider";
import { prisma } from "./shared/db";
import { startEmailSender } from "./shared/emailSender";
import { env } from "./shared/env";

async function start() {
  await prisma.$connect();
  console.log("Connected to PostgreSQL");
  await resumePendingReports();
  startEmailSender();
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

start().catch(async (err) => {
  console.error("Failed to start server:", err);
  await prisma.$disconnect();
  process.exit(1);
});
