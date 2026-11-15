import { prisma } from "../shared/db";

// Recomputes every audit row's hash and link in the database. Exits 1 if anything was altered.
// Run it on a schedule in production and before any audit export.
async function main() {
  const [{ rows, last }] = await prisma.$queryRaw<{ rows: bigint; last: bigint | null }[]>`
    SELECT count(*) AS rows, max(seq) AS last FROM audit_logs`;
  const breaks = await prisma.$queryRaw<{ seq: bigint; problem: string }[]>`SELECT * FROM audit_chain_breaks()`;
  if (breaks.length) {
    console.error(`Audit chain BROKEN at ${breaks.length} row(s):`);
    for (const b of breaks.slice(0, 20)) console.error(`  seq ${b.seq}: ${b.problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Audit chain intact: ${rows} row(s), last seq ${last ?? "-"}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
