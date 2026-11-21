# Tutorial 3: Node, TypeScript and Express

This tutorial builds a tiny API from an empty folder, then follows a real request through the RENTrust server. Node runs the code, TypeScript checks it, and Express handles the web requests.

## 1. How an API works

The web app and the server talk over **HTTP**. The web app sends a **request**; the server sends back a **response**.

A request has:

- a **method**, which says what kind of action it is,
- a **path** such as `/api/v1/listings`,
- optional **headers** (extra facts, such as who is signed in),
- an optional **body** (data, written as JSON).

| Method | Used for | Example in RENTrust |
| --- | --- | --- |
| `GET` | Read something | `GET /listings` |
| `POST` | Create something or run an action | `POST /interests` |
| `PATCH` | Change part of something | `PATCH /properties/:id` |
| `PUT` | Replace something | `PUT /properties/:id/terms` |
| `DELETE` | Remove something | `DELETE /listings/:id/save` |

A response has a **status code** and usually a JSON body.

| Code | Meaning |
| --- | --- |
| 200, 201 | It worked (201 means something was created) |
| 400 | The request was wrong, for example a missing field |
| 401 | You are not signed in |
| 403 | You are signed in but not allowed |
| 404 | It doesn't exist |
| 409 | It conflicts with the current state, for example approving an interest that was withdrawn |
| 500 | The server has a bug |

## 2. Set up a practice project

Make a folder outside the RENTrust repo:

```bash
mkdir ~/learn-api && cd ~/learn-api && npm init -y
```

```bash
npm install express
```

```bash
npm install --save-dev typescript tsx @types/express @types/node
```

What happened:

- `npm init` created `package.json`, the file that lists what your project needs.
- `npm install` downloaded the packages into `node_modules/`. Never edit or commit that folder.
- `--save-dev` marks tools that are only needed while developing. `tsx` runs TypeScript files directly. The `@types/…` packages describe Express and Node to TypeScript.

## 3. Just enough TypeScript

TypeScript is JavaScript plus **types**: labels that say what kind of value something is. Create `types.ts`:

```ts
// A type describes the shape of an object.
type House = {
  id: number;
  area: string;
  rent: number;
  bedrooms?: number; // the ? means this field may be missing
};

// Parameters and the result are labelled.
function describe(house: House): string {
  return `${house.area}: ₦${house.rent}`;
}

const houses: House[] = [
  { id: 1, area: "Lekki", rent: 4500000 },
  { id: 2, area: "Yaba", rent: 1800000, bedrooms: 2 },
];

console.log(houses.map(describe));

// A union: one of a fixed list of values.
type Status = "DRAFT" | "LIVE" | "PAUSED";
const status: Status = "LIVE";
console.log(status);
```

```bash
npx tsx types.ts
```

Now break it on purpose: change `rent: 4500000` to `rent: "a lot"`, or `"LIVE"` to `"LIVEE"`. Your editor underlines the mistake at once. Check from the command line with:

```bash
npx tsc --noEmit --strict types.ts
```

That is all TypeScript does: it catches these mistakes before the code runs. In RENTrust the same check is `npm run typecheck`.

You also need **`async` and `await`**. Anything slow, such as a database query, returns a *promise*: a value that arrives later. `await` waits for it, and you may only use `await` inside a function marked `async`.

```ts
async function findHouse(id: number) {
  const house = await database.find(id); // wait for the answer
  return house;
}
```

## 4. Your first server

Create `index.ts`:

```ts
import express from "express";

const app = express();
app.use(express.json()); // lets the server read JSON request bodies

type House = { id: number; area: string; rent: number };
const houses: House[] = [
  { id: 1, area: "Lekki", rent: 4500000 },
  { id: 2, area: "Yaba", rent: 1800000 },
];

// GET /houses : the whole list
app.get("/houses", (req, res) => {
  res.json({ houses });
});

// GET /houses/2 : one house. ":id" is a placeholder; its value arrives in req.params.
app.get("/houses/:id", (req, res) => {
  const house = houses.find((h) => h.id === Number(req.params.id));
  if (!house) {
    res.status(404).json({ error: "House not found" });
    return;
  }
  res.json({ house });
});

// POST /houses : add one. The data arrives in req.body.
app.post("/houses", (req, res) => {
  const { area, rent } = req.body ?? {};
  if (typeof area !== "string" || typeof rent !== "number") {
    res.status(400).json({ error: "area (text) and rent (number) are required" });
    return;
  }
  const house = { id: houses.length + 1, area, rent };
  houses.push(house);
  res.status(201).json({ house });
});

app.listen(4000, () => console.log("Listening on http://localhost:4000"));
```

Start it:

```bash
npx tsx index.ts
```

In a second terminal, call it with `curl`, a command-line tool for sending requests:

```bash
curl http://localhost:4000/houses
```

```bash
curl http://localhost:4000/houses/9
```

```bash
curl -X POST http://localhost:4000/houses -H "Content-Type: application/json" -d '{"area":"Ikeja","rent":900000}'
```

Each `app.get(path, function)` is a **route**. The function is a **handler**: it receives the request (`req`) and builds the response (`res`). Stop the server with Ctrl+C, and note that the house you added is gone. An array lives in memory. That is why real servers use a database.

## 5. Middleware

**Middleware** is a function that runs before the handlers. It can inspect the request, change it, stop it, or pass it on with `next()`. Add this above the routes in `index.ts`:

```ts
// Runs for every request
app.use((req, res, next) => {
  console.log(req.method, req.path);
  next(); // hand over to the next function in line
});

// Stops requests that don't carry the right header
function requireKey(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.headers["x-key"] !== "secret") {
    res.status(401).json({ error: "Missing key" });
    return;
  }
  next();
}
```

Then guard one route by putting the middleware before its handler:

```ts
app.post("/houses", requireKey, (req, res) => { /* same handler as before */ });
```

Restart, and the earlier `POST` now answers 401. Add `-H "x-key: secret"` to the `curl` command and it works again. RENTrust's `requireAuth` works the same way, with a real token in place of the fixed key.

## 6. Errors in one place

Writing `res.status(404).json(...)` in every handler gets repetitive. A cleaner pattern is to **throw** an error and catch every error in one place. Add this after all the routes:

```ts
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});
```

A middleware with four parameters is an **error handler**. Express calls it whenever a handler throws. In Express 5 this also covers errors inside `async` handlers. RENTrust uses this pattern everywhere: handlers throw, and [`app.ts`](../../server/app.ts) turns each error into a response.

## 7. Follow a real request

Open these files and trace `GET /api/v1/notifications/unread-count`.

1. [`server/index.ts`](../../server/index.ts) connects to the database and starts listening.
2. [`server/app.ts`](../../server/app.ts) sets up the middleware (CORS, JSON bodies, request IDs), mounts the routes under `/api/v1`, and ends with the error handler.
3. [`server/routes.ts`](../../server/routes.ts) has one line per feature. Everything below `requireAuth` needs a signed-in user. The line for `/notifications` hands over to that feature.
4. [`features/notifications/routes.ts`](../../server/features/notifications/routes.ts) maps each URL to a handler:

   ```ts
   router.get("/unread-count", unreadCount);
   ```

   A `Router` is a small group of routes, like the `app` in your practice server.
5. [`features/notifications/handlers.ts`](../../server/features/notifications/handlers.ts) has the handler. It reads who is signed in from `req.user`, runs a Prisma query (Tutorial 2), and sends JSON.

Every feature follows the same path, so once you can trace this one you can trace them all.

## 8. How the project is run

| Command (in `server/`) | What it does |
| --- | --- |
| `npm run dev` | Starts the server with `tsx` and restarts it whenever you save a file (`nodemon` does the watching) |
| `npm run typecheck` | Checks every file's types without running anything |
| `npm run smoke` | Starts a throwaway copy of the server and database, and calls every feature |
| `npm run build`, `npm start` | Convert the TypeScript to JavaScript, then run that. This is what a live server does. |

Settings such as the port and the database address live in `server/.env` and are read in one place, [`shared/env.ts`](../../server/shared/env.ts). The `.env` file holds secrets, so it is never committed.

## Exercises

1. In the practice server, add `DELETE /houses/:id`. Answer 404 if the house doesn't exist.
2. Add a `?maxRent=2000000` filter to `GET /houses`. Query values arrive in `req.query` as text.
3. Make `POST /houses` answer 400 when `rent` is zero or negative.
4. In RENTrust, find the handler for `POST /api/v1/properties/:id/submit`. Which three files did you pass through?
5. In [`shared/input.ts`](../../server/shared/input.ts), read `str`. What does it do when the value is too long?

## Answers

```ts
// 1
app.delete("/houses/:id", (req, res) => {
  const index = houses.findIndex((h) => h.id === Number(req.params.id));
  if (index === -1) {
    res.status(404).json({ error: "House not found" });
    return;
  }
  houses.splice(index, 1);
  res.json({ ok: true });
});

// 2
app.get("/houses", (req, res) => {
  const maxRent = Number(req.query.maxRent);
  const result = req.query.maxRent ? houses.filter((h) => h.rent <= maxRent) : houses;
  res.json({ houses: result });
});

// 3: extend the check in POST /houses
if (typeof area !== "string" || typeof rent !== "number" || rent <= 0) { /* answer 400 */ }
```

4. `server/routes.ts`, then `features/properties/routes.ts`, then `features/properties/handlers.ts`.
5. It throws a 400 error that names the field and the limit, so the handler never sees the bad value.

## Go further

- [The Express guide](https://expressjs.com/en/guide/routing.html)
- [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [javascript.info](https://javascript.info), especially the chapters on promises and async/await
- [Node.js: Learn](https://nodejs.org/en/learn)

Next: [Tutorial 4: Login and security](4-login-and-security.md).
