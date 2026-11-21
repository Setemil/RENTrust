# Tutorial 1: PostgreSQL and SQL

PostgreSQL is the program that stores RENTrust's data. SQL is the language you use to talk to it. This tutorial builds a tiny rental database by hand, then reads the real one.

## 1. The ideas

- A **database** holds **tables**. RENTrust has tables such as `users`, `properties` and `listings`.
- A **table** is like a spreadsheet with fixed **columns**. Each **row** is one record: one user, one property.
- Every row has a **primary key**, a value that identifies it and never repeats. It is usually a column called `id`.
- A **foreign key** is a column that holds another table's primary key. `properties.lister_id` holds the `id` of the user who listed the property. That is how tables are linked.

## 2. Open a practice database

Create a database to practise in, then connect to it:

```bash
createdb rentrust_learn
```

```bash
psql rentrust_learn
```

You are now in `psql`, PostgreSQL's command line. The prompt reads `rentrust_learn=#`. Three things to know:

- Every SQL statement ends with a semicolon `;`. If you forget it, `psql` waits for more input.
- Commands that start with a backslash belong to `psql`, not SQL: `\dt` lists tables, `\d houses` describes one table, `\q` quits.
- SQL keywords are not case-sensitive. They are written in capitals here so you can tell them from names.

## 3. Create tables

```sql
CREATE TABLE landlords (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE houses (
  id          SERIAL PRIMARY KEY,
  landlord_id INTEGER NOT NULL REFERENCES landlords(id),
  area        TEXT NOT NULL,
  bedrooms    INTEGER NOT NULL DEFAULT 1,
  rent        INTEGER NOT NULL CHECK (rent > 0),
  status      TEXT NOT NULL DEFAULT 'DRAFT'
);
```

What each part means:

| Part | Meaning |
| --- | --- |
| `SERIAL PRIMARY KEY` | A number PostgreSQL fills in itself (1, 2, 3…) that identifies the row |
| `TEXT`, `INTEGER` | The column's type. PostgreSQL refuses a value of the wrong type. |
| `NOT NULL` | The column must have a value |
| `UNIQUE` | No two rows may share this value |
| `DEFAULT 1` | The value used when you don't give one |
| `CHECK (rent > 0)` | A rule every row must pass |
| `REFERENCES landlords(id)` | A foreign key: the value must be the `id` of an existing landlord |

These rules are called **constraints**. They matter because the database enforces them even when the application code has a bug.

Run `\d houses` to see the table you made.

## 4. Add rows: INSERT

```sql
INSERT INTO landlords (name, email) VALUES
  ('Bola Adeyemi', 'bola@example.com'),
  ('Chidi Okafor', 'chidi@example.com');

INSERT INTO houses (landlord_id, area, bedrooms, rent, status) VALUES
  (1, 'Lekki',   3, 4500000, 'LIVE'),
  (1, 'Yaba',    2, 1800000, 'LIVE'),
  (2, 'Ikeja',   1,  900000, 'DRAFT'),
  (2, 'Surulere', 2, 1500000, 'LIVE');
```

Now try to break a rule, and read each error:

```sql
INSERT INTO houses (landlord_id, area, rent) VALUES (99, 'Ajah', 1000000);
INSERT INTO houses (landlord_id, area, rent) VALUES (1, 'Ajah', -5);
INSERT INTO landlords (name, email) VALUES ('Copy', 'bola@example.com');
```

The first fails because landlord 99 doesn't exist, the second fails the `CHECK`, and the third breaks `UNIQUE`.

## 5. Read rows: SELECT

```sql
SELECT * FROM houses;                              -- every column, every row
SELECT area, rent FROM houses;                     -- only two columns
SELECT * FROM houses WHERE status = 'LIVE';        -- only matching rows
SELECT * FROM houses WHERE rent < 2000000 AND bedrooms >= 2;
SELECT * FROM houses ORDER BY rent DESC;           -- highest rent first
SELECT * FROM houses ORDER BY rent LIMIT 2;        -- the two cheapest
```

`WHERE` filters, `ORDER BY` sorts, `LIMIT` cuts the list short. Text goes in single quotes. `--` starts a comment.

## 6. Change and remove rows: UPDATE and DELETE

```sql
UPDATE houses SET status = 'LIVE' WHERE id = 3;
UPDATE houses SET rent = rent + 100000 WHERE area = 'Yaba';
DELETE FROM houses WHERE id = 4;
```

**Always write the `WHERE` first.** `UPDATE houses SET status = 'LIVE';` with no `WHERE` changes every row, and `DELETE FROM houses;` removes them all.

Now try `DELETE FROM landlords WHERE id = 1;`. PostgreSQL refuses, because houses still point at that landlord. RENTrust relies on the same protection to keep evidence from disappearing.

## 7. Link tables: JOIN

A house row only holds `landlord_id`. To see the landlord's name beside each house, join the two tables on the key they share:

```sql
SELECT houses.area, houses.rent, landlords.name
FROM houses
JOIN landlords ON landlords.id = houses.landlord_id;
```

Read it as: for each house, find the landlord whose `id` equals the house's `landlord_id`, and put the two side by side.

## 8. Count and group

```sql
SELECT COUNT(*) FROM houses;
SELECT status, COUNT(*) FROM houses GROUP BY status;
SELECT landlords.name, COUNT(*) AS houses, SUM(houses.rent) AS total_rent
FROM houses
JOIN landlords ON landlords.id = houses.landlord_id
GROUP BY landlords.name;
```

`GROUP BY` puts rows with the same value in one pile, and `COUNT`, `SUM`, `AVG`, `MIN` and `MAX` summarise each pile.

## 9. Transactions: all or nothing

Some changes only make sense together. A **transaction** makes several statements succeed or fail as one.

```sql
BEGIN;
UPDATE houses SET status = 'OCCUPIED' WHERE id = 1;
SELECT * FROM houses WHERE id = 1;   -- shows OCCUPIED, but only to you
ROLLBACK;                            -- undo everything since BEGIN
SELECT * FROM houses WHERE id = 1;   -- LIVE again
```

Use `COMMIT;` instead of `ROLLBACK;` to keep the changes. RENTrust uses a transaction whenever it changes a status, so the status change and its audit row are saved together or not at all.

## 10. Indexes

An **index** lets PostgreSQL find rows by a column without reading the whole table, the way a book's index saves you reading every page.

```sql
CREATE INDEX houses_status_idx ON houses (status);
```

Primary keys and `UNIQUE` columns get an index automatically. Add one to a column you filter on often. RENTrust indexes `listings.status` for this reason.

## 11. Read the real database

Quit with `\q`, then connect to the project's database. **Only run `SELECT` here.**

```bash
psql rentrust
```

Look around with `\dt` and `\d listings`, then try these:

```sql
SELECT email, user_type, kyc_status FROM users;

SELECT listings.ref, properties.title, properties.area, listings.rent_amount, listings.status
FROM listings
JOIN properties ON properties.id = listings.property_id
ORDER BY listings.ref;

SELECT status, COUNT(*) FROM interests GROUP BY status;

SELECT seq, action, entity_type, created_at FROM audit_logs ORDER BY seq DESC LIMIT 10;
```

Things you will notice that the practice tables didn't have:

- **IDs are UUIDs** (long random strings) instead of 1, 2, 3, so they can't be guessed.
- **Status columns are enums.** `listings.status` only accepts a fixed list of values such as `DRAFT` and `LIVE`.
- **`deleted_at` columns.** Users, properties and listings are never removed. A row is marked deleted by setting this date.
- **The audit log refuses changes.** It can only be added to. You can read about it in the [main README](../../README.md#records-and-errors).

## Exercises

Do these in `rentrust_learn`. Answers are at the bottom.

1. List the area and rent of every `LIVE` house, cheapest first.
2. Add a third landlord and give them a 4-bedroom house in Ikoyi at 9,000,000.
3. Show each landlord's name and the rent of their most expensive house.
4. In a transaction, raise every rent by 10%, look at the result, then undo it.
5. In `rentrust`: show the title and area of every listing whose status is `LIVE`.

## Where RENTrust uses this

You rarely write SQL by hand in this project. Prisma writes it for you, and Tutorial 2 covers that. The one place with hand-written SQL is the [migrations folder](../../server/prisma/migrations/), where each `migration.sql` is a list of `CREATE TABLE` and `ALTER TABLE` statements like the ones above.

## Answers

```sql
-- 1
SELECT area, rent FROM houses WHERE status = 'LIVE' ORDER BY rent;

-- 2
INSERT INTO landlords (name, email) VALUES ('Ada Eze', 'ada@example.com');
-- The new landlord's id may not be 3: the failed insert in section 4 used a number up.
-- So look the id up instead of guessing it.
INSERT INTO houses (landlord_id, area, bedrooms, rent)
VALUES ((SELECT id FROM landlords WHERE email = 'ada@example.com'), 'Ikoyi', 4, 9000000);

-- 3
SELECT landlords.name, MAX(houses.rent)
FROM houses JOIN landlords ON landlords.id = houses.landlord_id
GROUP BY landlords.name;

-- 4
BEGIN;
UPDATE houses SET rent = rent * 1.1;
SELECT area, rent FROM houses;
ROLLBACK;

-- 5 (in rentrust)
SELECT properties.title, properties.area
FROM listings JOIN properties ON properties.id = listings.property_id
WHERE listings.status = 'LIVE';
```

## Go further

- [SQLBolt](https://sqlbolt.com): short interactive lessons.
- [The PostgreSQL tutorial](https://www.postgresql.org/docs/current/tutorial.html): the official introduction.

Next: [Tutorial 2: Prisma](2-prisma.md).
