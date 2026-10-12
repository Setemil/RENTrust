---
name: RENTrust
description: Marketplace for Verified Property Listings, drawn as a registered survey plan.
colors:
  navy: "#0e3b61"
  navy-soft: "#41596e"
  green: "#2a8651"
  green-text: "#227044"
  green-on-navy: "#8fd3a6"
  film: "#f1f5f3"
  film-deep: "#e4ebe8"
  on-navy: "#f1f5f3"
  on-navy-soft: "#a9c0d2"
  error: "#b42318"
typography:
  display:
    fontFamily: "Overpass Variable, Overpass, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.4rem + 5vw, 4rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Overpass Variable, Overpass, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.2rem + 3vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Overpass Variable, Overpass, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Overpass Variable, Overpass, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "tnum"
  lead:
    fontFamily: "Overpass Variable, Overpass, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Overpass Variable, Overpass, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.45
    fontFeature: "tnum"
  logo:
    fontFamily: "Montserrat Variable, Montserrat, Overpass Variable, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
rounded:
  none: "0px"
  beacon: "50%"
spacing:
  "1": "0.5rem"
  "2": "1rem"
  "3": "1.5rem"
  "4": "2.5rem"
  "5": "4rem"
  "6": "clamp(4.5rem, 3rem + 6vw, 8rem)"
  gutter: "clamp(1rem, 3.5vw, 2.5rem)"
  page-max: "84rem"
  header-h: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1.25rem"
    height: "2.875rem"
  button-primary-hover:
    backgroundColor: "{colors.green-text}"
    textColor: "{colors.on-navy}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.navy}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1.25rem"
    height: "2.875rem"
  button-outline-hover:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
  button-small:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.none}"
    padding: "0.4rem 1rem"
    height: "2.5rem"
  input-field:
    backgroundColor: "#ffffff"
    textColor: "{colors.navy}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.7rem"
    height: "2.75rem"
  title-block:
    backgroundColor: "{colors.film}"
    textColor: "{colors.navy}"
    rounded: "{rounded.none}"
    padding: "1rem"
  sheet-navy:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.on-navy}"
    rounded: "{rounded.none}"
  nav-link:
    textColor: "{colors.navy-soft}"
    typography: "{typography.label}"
---

# Design System: RENTrust

## Overview

**Creative North Star: "The Registered Survey Plan"**

RENTrust proves a rental the way a licensed surveyor proves a plot, so every surface is a drawing sheet: cool drafting film, navy technical-pen linework, beacons with IDs, bearings and distances on edges, a framed title block, a north arrow and scale bars. Trust is shown by drawing the mechanism, never by adjectives or imagery. The category default (an apartment photo under a search bar) is rejected outright; there is no photography in this system.

The page is a set of numbered sheets. Each sheet carries a double drawing border and a sheet/scale cell bottom-right ("Sheet 2 of 5 · 1:100"), and the scale rises sheet by sheet from 1:200 to 1:10, zooming from the whole parcel to the detail of signing up. The faint background grid grows with the scale, so the zoom is felt, not just labelled. Density is calm and technical: generous sheet padding, hairline rules between rows, a single family of type with tabular figures.

Colour is rationed by role. Navy draws everything. Green appears only where something is verified, checked or unlocked; its rarity is what makes "verified" mean something. The one full navy sheet is the closing call, the drawing's final sheet inverted.

**Key Characteristics:**
- Drafting-film ground, navy pen linework, green only for verified states.
- Square corners everywhere; circles are reserved for beacons and keys.
- Sheets, not cards: double-border frames, sheet/scale cells, scale-tied grids.
- One type family (Overpass) with tabular numerals for every number.
- Flat: depth comes from line weight, never shadow.
- Motion is a survey traverse: lines drawn beacon to beacon, beacons turning green as checked.

## Colors

A two-ink drafting palette, navy and green on a cool film, with green held back for verification.

### Primary
- **Survey Navy** (`navy`): the pen. All linework, headings, body text, frames, primary buttons, the closing sheet's ground. Brand REN colour.

### Secondary
- **Verified Green** (`green`): beacons once checked, the closed parcel boundary, the final step's beacon, the "Trust" in the wordmark, selection hatch and caret. Never decorative.
- **Verified Green, Text** (`green-text`): the darker green for green type on film ("Verified plot", "Unlocks …" lines) and the primary button's hover fill, where `green` would fall short on contrast.
- **Verified Green on Navy** (`green-on-navy`): the green for verified states set on the navy sheet.

### Neutral
- **Drafting Film** (`film`): page ground and title-block fill; also the on-navy text colour (`on-navy`).
- **Film Deep** (`film-deep`): scrollbar track and the rare recessed film surface.
- **Faded Pen** (`navy-soft`): secondary text, intros, nav links, edge labels, leader lines.
- **Faded Pen on Navy** (`on-navy-soft`): secondary text and the frame on the navy sheet.
- **Derived inks** (from `navy`/`green` via `color-mix`): rule = navy 22% (hairlines between rows, inner frame), grid = navy 7% (sheet grid), hatch = green 26% (parcel and overlap hatching, text selection). On navy, the grid is on-navy 6% and the inner rule on-navy 25%.
- **Error Red** (`error`): invalid inputs and their messages only.

### Named Rules
**The Verified-Only Green Rule.** Green marks something checked, verified or unlocked, and nothing else. If an element is green and you cannot say what was verified, it is navy.

**The Two-Ink Rule.** Every surface is navy on film, or film on navy. No third hue enters except error red on an invalid field.

## Typography

**Display Font:** Overpass Variable (with Overpass, system-ui, sans-serif)
**Body Font:** Overpass Variable
**Logo Font:** Montserrat Variable, used only inside the wordmark and its tagline

**Character:** Overpass descends from US highway signage lettering, which gives the plan an engineered, lettered-by-template voice. Heavy weights (800) with tight tracking for headings; regular weight with open leading for prose.

### Hierarchy
- **Display** (800, clamp 2.5rem → 4rem; on the desktop hero it scales with the plan to 6cqi up to 5.5rem; line-height 0.98; -0.04em): the hero headline, centred and lettered inside the parcel.
- **Headline** (800, clamp 2rem → 3.25rem, 1.05, -0.03em): each sheet's title (h2), balanced wrap.
- **Title** (800, 1.25rem, 1.25, -0.015em): step titles, title-block titles, check notes.
- **Lead** (400, 1.25rem, 1.5): sheet intros and the hero sub-line, in Faded Pen, max ~34–40rem.
- **Body** (400, 1.0625rem, 1.6): prose, max ~34rem, pretty wrap.
- **Label** (600–700, 0.875rem): form labels, nav, step numbers, "Unlocks" lines, title-block metadata.
- **Drawing annotation** (600–800, 13–22px in SVG units): beacon IDs, bearings, distances, scale-bar figures; enlarged on mobile so they stay legible once the plan shrinks.

### Named Rules
**The Tabular Figures Rule.** Every number is set with tabular figures (`font-variant-numeric: tabular-nums` on body and every SVG text). Bearings, distances, sheet numbers and step numbers must align like a schedule.

**The One Family Rule.** Overpass sets everything outside the wordmark. Montserrat never leaves the logo.

## Layout

The page is a vertical stack of sheets. Each sheet sits inside the page gutter (clamp 1rem → 2.5rem) and is capped at 84rem. Its frame is a 2px pen border, a 6px gap, then a 1px rule inner border; inner padding is fluid (clamp 1.5rem → 4rem) with extra bottom room for the sheet/scale cell pinned to the bottom-right corner.

Sheet scales run 1:200, 1:100, 1:50, 1:20, 1:10. A scale unit is derived per sheet (6px × √(200 / scale): 6, 8, 12, 19, 27px), the background grid cell is 12 units (72px up to 324px), and the scale bar in the cell is four alternating filled/open segments of one unit each. Larger scale, bigger grid.

Spacing runs on a six-step rhythm (0.5, 1, 1.5, 2.5, 4rem and a fluid 4.5–8rem). Rows in schedules and notes are separated by hairline rules, with the first row ruled in the 2px pen.

The header is sticky, 4rem tall, on film with a hairline bottom rule. The hero sheet always fills exactly one viewport (min-height 100svh minus the header), widens up to 160rem with the header aligned to it, and is the only sheet visible on load at any desktop size. The hero on desktop is an absolutely composed plate at the plan's 1200:680 aspect, sized to fit the first viewport; the parcel is centred and the copy (headline, green slogan line, body, two buttons) is centred inside it. The page carries exactly one waitlist form, in the closing title block; every other call to action links down to it. Breakpoints: 860px (hero, title block, landlord schedule and steps collapse to one column; the nav hides; the plan's strokes and labels enlarge), 560px (form rows and schedule rows stack), 1100px (checks diagram sits beside its notes, joined by leader lines).

## Elevation & Depth

None. The system is flat; there are no shadows anywhere. Depth and hierarchy come from line weight (1px hairline rule, 1.5px pen, 2px heavy pen), from the double-frame border, and from the single inversion to a navy sheet.

### Named Rules
**The Pen-Weight Rule.** Hierarchy is drawn with three line weights: 1px rules divide, 1.5px pens draw objects, 2px heavy pens frame and emphasise. Never use a shadow or blur to lift anything.

## Shapes

Every rectangle is square-cornered (0 radius): sheets, title blocks, buttons, inputs, selects. The only round forms are survey marks: beacons (filled or open circles with a 2px navy stroke), lettered key circles (A, B, C), and leader-line dots. Parcels are irregular polygons with labelled edges; verified areas are hatched in green at 26%. Lines and dashes carry meaning: a dashed line is a leg not yet walked (the final step's traverse).

### Named Rules
**The Circles-Are-Beacons Rule.** A circle always marks a point on the survey (beacon, key, station). Do not round a container, button or field.

## Components

### Buttons
Solid, square, unmistakable.
- **Shape:** square corners (0), 2px pen border matching the fill.
- **Primary:** navy fill, film text, 700 weight, 0.6rem 1.25rem padding, min height 2.875rem.
- **Hover / Focus / Active:** fill and border shift to Verified Green Text over 0.2s on the ease-out curve; focus is a 2px green outline offset 3px; active nudges down 1px.
- **Outline:** transparent fill, navy text and border; hover fills navy.
- **Small:** 0.4rem 1rem padding, 2.5rem min height, 0.875rem text (header CTA).

### Title Block
The signature container and the home of every conversion form, drawn like a drawing's title block.
- **Shape:** square, 2px navy border, film fill (it stays film on the navy sheet).
- **Head:** a title (Title style) and a right-aligned meta line in Faded Pen, separated from the body by a 1px navy rule.
- **Fields variant:** a schedule column of label/value pairs (label in Faded Pen 0.875rem, value 700) beside the body, divided by a 1px navy rule; on mobile the fields become a two-column grid above.

### Inputs / Fields
- **Style:** 1px navy border, square, white fill, navy text, min height 2.75rem; labels above in Label weight 700. Selects drop the native chevron for a drawn navy caret.
- **Focus:** 2px green outline, no offset.
- **Error:** border and 1px outline in Error Red, message below in 600 Error Red.

### Navigation
- **Style:** sticky film header, wordmark left, text links right in Label 600 Faded Pen, then a small primary button.
- **Hover:** links darken to navy and underline.
- **Mobile:** links hide below 860px; the wordmark and the waitlist button remain.

### Sheet
The page's unit of composition. A double frame (2px pen, 6px gap, 1px rule), optional scale-tied grid, a header (Headline plus a Lead intro, max 40rem), and the sheet/scale cell bottom-right with a four-segment scale bar. Tones: film (default) or navy (the closing sheet only).

### Survey Plan Drawings
Inline SVG plates. Parcel boundary: navy traverse that closes green; beacons labelled RT 01…; each edge carries a bearing and a distance in Faded Pen; north arrow and scale bar top-left. The checks diagram overlaps three outlines, hatches only the intersection and labels it "Verified", and reaches its notes with leader lines ending in a dot. On load (motion allowed) a CSS traverse draws the boundary in one navy stroke; each beacon turns green as the line reaches it (delays computed from leg lengths), RT 01 pulses when the plot closes, the boundary turns green, then the hatch and legend settle in. On wide desktops, scrolling out of the hero pins it and scales the whole sheet down (from its bottom edge) until it matches the width of the sheets below. As the checks diagram scrolls into view, the three outlines converge from offset positions (scrubbed to scroll) and the hatched "Verified" intersection appears only once they overlap.

### Traverse (Steps)
Stations on a 2px navy line: open 16px beacons for steps in progress, a green beacon and a dashed last leg for the final step. Each station shows a zero-padded number, a title, a short body and a green "Unlocks …" line. Horizontal on desktop, vertical on mobile.

## Do's and Don'ts

### Do:
- **Do** draw every surface as a sheet with the double frame and a sheet/scale cell, and raise the scale as the story zooms in.
- **Do** reserve green for verified, checked or unlocked states, using `green-text` for green type on film.
- **Do** express trust as mechanism: beacons, bearings, overlaps, title-block schedules.
- **Do** set every number in tabular figures.
- **Do** separate rows with 1px rules and lead a schedule with a 2px pen rule.
- **Do** build motion with GSAP through `useMotion` in `web/src/lib/motion.ts`, which wraps `useGSAP` and `gsap.matchMedia()`: animations run only under `prefers-reduced-motion: no-preference`, and the markup's default state is always the finished drawing, so reduced motion and failed scripts show the verified plan.
- **Do** limit motion to these explanatory moments: the hero traverse (CSS, on load), the hero sheet shrinking to the standard sheet width (GSAP scroll scrub, only when it is wider than the other sheets), the checks convergence (scroll scrub) and the Steps route drawing station to station (scroll scrub). Don't add section reveals, hover lifts or parallax.

### Don't:
- **Don't** use property photography or an image-under-search-bar hero.
- **Don't** add shadows, blurs or rounded containers; depth is line weight only.
- **Don't** use green as decoration or a generic accent.
- **Don't** wrap content in cards; use sheets, title blocks and ruled schedules.
- **Don't** introduce a second typeface outside the wordmark.
