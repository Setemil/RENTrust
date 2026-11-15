# RENTrust

## Skills

- Use the `impeccable` skill (installed at `.claude/skills/impeccable/`) for all UI work: building a new UI or changing the look of an existing one, including pages, components, layouts, styling, typography, color and motion. Use it for design reviews too (critique, audit, polish).
- Invoke it before writing the markup or CSS, and follow its setup steps (context loading, playbook, craft floor) as written.
- Project design context lives in `PRODUCT.md` and `DESIGN.md` once `/impeccable init` has been run. Keep the established brand: the RENTrust logo, navy `#0E3B61` and green `#2A8651` (see `web/src/styles.css` and `web/public/brand/`).
- Do not use the older `frontend-design` skill for this project.
- If `impeccable` is not listed in `/skills`, tell the user instead of improvising a replacement.

### Taste skills (from `Leonxlnx/taste-skill`, tracked in `skills-lock.json`)

- `impeccable` stays the lead UI skill. Use `design-taste-frontend`, `high-end-visual-design` or `redesign-existing-projects` only when the user names them, or as a second-opinion review alongside `impeccable`.
- Style-preset skills (`minimalist-ui`, `industrial-brutalist-ui`, `gpt-taste`) impose their own palette, type and motion. Use them only when the user asks for that style, and never let them override the RENTrust brand colors or logo.
- `stitch-design-taste` writes its own `DESIGN.md`. Do not let it overwrite the `DESIGN.md` produced by `/impeccable init`.
- Image-generation skills (`brandkit`, `imagegen-frontend-web`, `imagegen-frontend-mobile`, `image-to-code`) need an image-generation tool. Only use them on request.

## Code style

The owner wants code that a new developer can read and extend on day one. This applies to all code, and most of all to `server/`.

- Follow [`server/README.md`](server/README.md): one folder per feature in `server/features/` (`routes.ts` and `handlers.ts`), shared tools in `server/shared/`, one line per feature in `server/routes.ts`.
- Write the plainest code that works. No classes, decorators, generic base handlers, clever type tricks or speculative abstractions.
- One job per function, and handlers that fit on one screen. Pull a named helper out when one grows.
- Build the smallest version of a feature that does the job. Share a helper only when it is used twice.
- Encapsulate rules in one place: status changes go through one function per entity (`transitionInterest`, `setListingStatus`), every state change calls `audit`, and errors are thrown from `shared/errors.ts`.
- Open each file with a line or two on what it is for. Comments explain why, not what.
- After changing the server, run `npm run typecheck` and `npm run smoke` in `server/`, and add checks to `server/scripts/smoke.mjs` for anything new.
