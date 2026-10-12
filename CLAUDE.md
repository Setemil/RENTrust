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
