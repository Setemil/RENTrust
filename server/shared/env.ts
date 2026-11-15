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
  isProduction: process.env.NODE_ENV === "production",
  // How long the simulated character-report provider takes.
  reportDelayMs: Number(process.env.REPORT_DELAY_MS ?? 4000),
};
