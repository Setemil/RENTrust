# Learn the RENTrust backend

Four hands-on tutorials for someone starting from scratch. Each one teaches a technology with small examples, then shows where RENTrust uses it. Type the examples yourself instead of copying them; that's what makes them stick.

Do them in order. Each takes one to three sittings.

| # | Tutorial | You will be able to |
| --- | --- | --- |
| 1 | [PostgreSQL and SQL](1-postgresql-and-sql.md) | Create tables, read and change rows, join tables, use transactions |
| 2 | [Prisma](2-prisma.md) | Read `schema.prisma`, change the database with a migration, query from TypeScript |
| 3 | [Node, TypeScript and Express](3-node-typescript-express.md) | Build a small API and follow a request through the RENTrust server |
| 4 | [Login and security](4-login-and-security.md) | Explain password hashing, tokens and route guards, and call the API by hand |

## Before you start

You need Node.js 20.19 or newer and PostgreSQL, the same as the project. Check both:

```bash
node --version
```

```bash
psql --version
```

Set up the project database once, as described in the [main README](../../README.md#getting-started), so the tutorials have real data to read.

## Two rules while learning

- **Practise changes in the practice database.** Tutorial 1 creates a database called `rentrust_learn`. Change anything you like there. In the real `rentrust` database, only read.
- **When something fails, read the error.** PostgreSQL, Prisma and TypeScript all say which line and which name they disliked. Most errors are a typo or a missing comma.

## After the tutorials

Read [`server/README.md`](../../server/README.md), then add a small feature of your own by following its "Adding a feature" steps. Building one feature end to end teaches more than any further reading.
