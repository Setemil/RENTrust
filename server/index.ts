import { app } from "./app";
import { resumePendingReports } from "./features/interests/reportProvider";
import { prisma } from "./shared/db";
import { startEmailSender } from "./shared/emailSender";
import { emailConnected, env, photosConnected } from "./shared/env";
import { log } from "./shared/log";

// Starts the server, and says once at startup which outside services are connected, so a
// missing setting shows up in the log instead of as a silent "the email never came".
function reportConnections() {
  log.info("settings", { testMode: env.testMode, clientUrl: env.clientUrl, email: emailConnected ? `from ${env.emailFrom}` : "off", photos: photosConnected ? "on" : "off" });
  if (!emailConnected) {
    const missing = [!env.resendApiKey && "RESEND_API_KEY", !env.emailFrom && "EMAIL_FROM"].filter(Boolean);
    log.warn("email is off, so codes, reset links and notifications are not emailed", { missing });
  }
  if (!photosConnected) log.warn("listing photos are off", { missing: "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET" });
}

async function start() {
  await prisma.$connect();
  log.info("connected to PostgreSQL");
  reportConnections();
  await resumePendingReports();
  startEmailSender();
  app.listen(env.port, () => {
    log.info("server listening", { port: env.port });
  });
}

// A promise nobody caught would otherwise vanish without a trace.
process.on("unhandledRejection", (err) => log.error("unhandled promise rejection", { err }));

start().catch(async (err) => {
  log.error("server failed to start", { err });
  await prisma.$disconnect();
  process.exit(1);
});
