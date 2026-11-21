import "dotenv/config";

// Every setting the server reads from the environment, in one place. See .env.example.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT) || 5050,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // Test mode shows email and phone codes and password-reset links on screen, because email and
  // SMS aren't connected yet. It is on locally. Hosts such as Railway set NODE_ENV=production
  // for you, which turns it off, so a hosted beta sets TEST_MODE=true to keep it on. Turn it off
  // before real people sign up: anyone could then confirm any email or phone.
  testMode: process.env.TEST_MODE ? process.env.TEST_MODE === "true" : process.env.NODE_ENV !== "production",
  // How many proxies (load balancer, CDN) sit in front of the API. Rate limits and audit rows
  // need the visitor's real IP, which only comes through when this matches the host. 0 locally.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  // Email through Resend. Both are needed: EMAIL_FROM must be on a domain verified in Resend,
  // e.g. "RENTrust <no-reply@mail.rentrust.ng>". Without them, email is simulated.
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  // Listing photos on Cloudinary. Without these, photo uploads are switched off.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  // How long the simulated character-report provider takes.
  reportDelayMs: Number(process.env.REPORT_DELAY_MS ?? 4000),
};

export const emailConnected = Boolean(env.resendApiKey && env.emailFrom);
export const photosConnected = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
