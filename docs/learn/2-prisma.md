# Tutorial 2: Prisma

Prisma sits between the TypeScript code and PostgreSQL. You describe the tables in one file, Prisma keeps the database in step with it, and you query with TypeScript functions instead of SQL strings. Do [Tutorial 1](1-postgresql-and-sql.md) first.

## 1. The three parts

| Part | What it is | Where |
| --- | --- | --- |
| **Schema** | One file that describes every table | [`server/prisma/schema.prisma`](../../server/prisma/schema.prisma) |
| **Migrations** | Saved SQL files that change the database step by step | [`server/prisma/migrations/`](../../server/prisma/migrations/) |
| **Client** | Generated code you import to run queries | `prisma` from [`server/shared/db.ts`](../../server/shared/db.ts) |

## 2. Read a model

A **model** in the schema is one table. This is a shortened `Property`:

```prisma
model Property {
  id        String    @id @default(uuid()) @db.Uuid
  listerId  String    @map("lister_id") @db.Uuid
  title     String
  bedrooms  Int       @default(0)
  sizeSqm   Int?      @map("size_sqm")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)

  lister  User     @relation(fields: [listerId], references: [id], onDelete: Restrict)
  listing Listing?

  @@index([listerId])
  @@map("properties")
}
```

Each line is a column: a name, a type, then rules.

| Piece | Meaning | SQL from Tutorial 1 |
| --- | --- | --- |
| `String`, `Int`, `DateTime` | The column's type | `TEXT`, `INTEGER`, `TIMESTAMPTZ` |
| `Int?` | The `?` means the value may be empty | a column without `NOT NULL` |
| `@id` | The primary key | `PRIMARY KEY` |
| `@default(uuid())` | The value used when none is given | `DEFAULT` |
| `@unique` | No two rows may share the value | `UNIQUE` |
| `@map("lister_id")` | The column's name in the database. Code says `listerId`, the table says `lister_id`. | |
| `@@map("properties")` | The table's name in the database | |
| `@relation(fields: [listerId], references: [id])` | A foreign key: `listerId` holds a user's `id` | `REFERENCES users(id)` |
| `onDelete: Restrict` | Refuse to delete a user who still has properties | |
| `@@index([listerId])` | An index on that column | `CREATE INDEX` |

Two lines are not columns. `lister User` and `listing Listing?` are **relation fields**: they exist only in code and let you fetch the linked rows. An **enum**, such as `ListingStatus`, is a fixed list of allowed values.

## 3. Run queries

Create a scratch file at `server/learn.ts`. Delete it when you finish; don't commit it.

```ts
import { prisma } from "./shared/db";

async function main() {
  // Every row
  const users = await prisma.user.findMany();
  console.log(users.length, "users");

  // Filter, sort, limit, and pick columns
  const live = await prisma.listing.findMany({
    where: { status: "LIVE" },
    orderBy: { rentAmount: "asc" },
    take: 3,
    select: { ref: true, rentAmount: true },
  });
  console.log(live);

  // One row by a unique column. The result is null when nothing matches.
  const landlord = await prisma.user.findUnique({ where: { email: "landlord@rentrust.test" } });
  console.log(landlord?.kycStatus);

  // Bring linked rows along (this is the JOIN from Tutorial 1)
  const withProperty = await prisma.listing.findFirst({
    where: { status: "LIVE" },
    include: { property: true },
  });
  console.log(withProperty?.property.title);

  // Count
  console.log(await prisma.listing.count({ where: { status: "LIVE" } }), "live listings");
}

main().finally(() => prisma.$disconnect());
```

Run it from the `server` folder:

```bash
npx tsx learn.ts
```

Things to notice:

- **Every query starts with `await`.** A query takes time, so it returns a promise. `await` waits for the answer.
- **Your editor completes the names.** Type `prisma.` and it lists every model. Type a wrong column name and TypeScript underlines it before you run anything. That is the main reason to use Prisma.
- **`select` picks columns, `include` adds linked rows.** Use one or the other in a query.

The same queries in SQL and Prisma:

| SQL | Prisma |
| --- | --- |
| `SELECT * FROM listings WHERE status = 'LIVE'` | `prisma.listing.findMany({ where: { status: "LIVE" } })` |
| `ORDER BY rent_amount LIMIT 3` | `orderBy: { rentAmount: "asc" }, take: 3` |
| `INSERT INTO …` | `prisma.listing.create({ data: { … } })` |
| `UPDATE … WHERE id = …` | `prisma.listing.update({ where: { id }, data: { … } })` |
| `JOIN properties …` | `include: { property: true }` |
| `COUNT(*)` | `prisma.listing.count({ where: { … } })` |

## 4. Change data

These are shown for reading only. Don't run them against the project database from a scratch file, because RENTrust's rules say every change must also write an audit row.

```ts
// Add a row
const created = await prisma.notification.create({
  data: { userId, event: "welcome", channel: "IN_APP", title: "Welcome", body: "Your account is ready" },
});

// Change one row
await prisma.notification.update({ where: { id: created.id }, data: { readAt: new Date() } });

// Change every matching row; the result says how many changed
const { count } = await prisma.notification.updateMany({
  where: { userId, readAt: null },
  data: { readAt: new Date() },
});
```

You can see real ones in [`features/notifications/handlers.ts`](../../server/features/notifications/handlers.ts).

## 5. Transactions

A transaction makes several changes succeed or fail together, exactly as `BEGIN … COMMIT` did in Tutorial 1. In Prisma you pass a function, and use the `tx` it gives you in place of `prisma`:

```ts
await prisma.$transaction(async (tx) => {
  await tx.listing.update({ where: { id }, data: { status: "PAUSED" } });
  await audit(tx, { actorId, action: "listing.paused", entityType: "Listing", entityId: id });
});
```

If anything inside throws, both changes are undone. This is the pattern behind every status change in RENTrust. See `setListingStatus` in [`features/properties/listing.ts`](../../server/features/properties/listing.ts).

## 6. Change the database: migrations

You never edit tables by hand. The steps are always the same:

1. Edit `schema.prisma`. For example, add a column to a model:

   ```prisma
   yearBuilt Int? @map("year_built")
   ```

2. Create and apply a migration:

   ```bash
   npx prisma migrate dev --name add_year_built
   ```

   Prisma compares the schema with the database, writes the SQL into a new folder under `prisma/migrations/`, runs it, and regenerates the client.

3. Open the new `migration.sql` and read it. You will recognise the `ALTER TABLE` statement.
4. Commit the schema and the migration folder together.

Rules that keep migrations safe:

- **Never edit a migration that has already been applied or pushed.** Write a new one.
- **A new column on a table that has rows must be optional (`?`) or have a `@default`.** Otherwise the existing rows have nothing to put in it.
- **Other developers and the live server apply migrations with `npx prisma migrate deploy`**, which only runs what is already saved.

To practise without touching your real data, make the change, look at the migration, then put everything back with `npm run db:reset`. That command wipes the database and re-seeds it, so use it only on your own machine.

## 7. Look at the data

```bash
npm run db:studio
```

Prisma Studio opens in the browser and shows every table as a grid. Keep it open while you use the web app, and watch rows appear as you click.

## 8. The commands

Run these in `server/`.

| Command | When to use it |
| --- | --- |
| `npm run db:migrate` | After you change `schema.prisma` |
| `npm run db:deploy` | To apply saved migrations without creating one |
| `npm run db:seed` | To add the test accounts and listings |
| `npm run db:reset` | To wipe the database and start again |
| `npm run db:studio` | To browse the data |
| `npx prisma generate` | To rebuild the client if the editor doesn't know a new model |

## Exercises

Write these in `learn.ts`. Answers are at the bottom.

1. Print the email of every user whose `kycStatus` is `VERIFIED`.
2. Print each live listing's `ref` together with its property's `area`.
3. Count the interests in each status. (Look up `groupBy` in the Prisma docs.)
4. Find the `Notification` model in the schema. Which column records that it has been read, and why is it a date instead of true/false?
5. Open the newest folder in `prisma/migrations/` and find one `ALTER TABLE` statement. Which model line in the schema does it match?

## Answers

```ts
// 1
const verified = await prisma.user.findMany({ where: { kycStatus: "VERIFIED" }, select: { email: true } });
console.log(verified.map((u) => u.email));

// 2
const listings = await prisma.listing.findMany({
  where: { status: "LIVE" },
  select: { ref: true, property: { select: { area: true } } },
});
for (const l of listings) console.log(l.ref, l.property.area);

// 3
console.log(await prisma.interest.groupBy({ by: ["status"], _count: true }));
```

4. `readAt`. A date answers two questions at once: whether it was read (empty means no) and when.

## Go further

- [Prisma's getting-started guide](https://www.prisma.io/docs/getting-started)
- [The Prisma Client query reference](https://www.prisma.io/docs/orm/prisma-client/queries/crud)

Next: [Tutorial 3: Node, TypeScript and Express](3-node-typescript-express.md).
