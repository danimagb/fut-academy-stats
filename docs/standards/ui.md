# UI: HTML, events, CSS, I18N, accessibility

## HTML strings and escaping (security)

Screens build HTML strings and assign them to `innerHTML`, so **any value that comes from
data must be escaped.** Data includes player and team names, opponents, emails and anything
from the cloud. The data is shared between coaches, so one unescaped name is a cross-site
scripting (XSS) hole on every phone that syncs it.

- Escape every value from data with `esc()` when you put it into the HTML, including
  inside attributes (`value="${esc(p.name)}"`). Only HTML built in code and strings from
  `I18N` that may contain markup go in unescaped.
- A function that returns HTML ends in `Html` (`subLineHtml`, `scoreHtml`). It takes raw
  values and escapes them itself, or its comment says that it expects already-escaped
  names, as the code does today.
- Never build a `<script>` tag, an `on*=` attribute or a URL from data.
- (Step 6 may add a small `html` tagged template that escapes automatically. If it does, use
  it in all new code.)

## Events

- **Don't use inline handlers** (`onclick="…"`). A button declares what it does:
  `<button data-action="game.goal" data-id="${esc(p.id)}">`. One listener in `app/actions.ts`
  reads it and calls the matching handler.
- Name **new** actions `'<slice>.<verb>'`, after the feature or page that owns them
  (`substitution.make`, `log-event.goal`). Shared actions have no prefix (`close-sheet`). The
  existing names (`kickoff`, `end-period`, `do-sub`, …) stay as they are, so moving a screen
  doesn't also change its HTML.
- Register handlers with `registerActions({...})` from `app/actions.ts`, in the file of the
  page or feature that owns them. A name registered twice throws an error.
- Handlers get `(el: HTMLElement, ev: Event)` and read their arguments from `el.dataset`.
  They change `state`, call `save()` and then `render()`. They don't change the DOM
  directly, except for the drag-and-drop on the game screen and small live updates such as
  the clock tick.
- Confirmations use `confirmSheet()` and messages use `alertSheet()`. Never use `confirm()`
  or `alert()`.

## CSS and themes

- Every colour is a **CSS variable** on `:root` (dark), with its light value under
  `[data-theme="light"]`. A new colour needs both, and is checked in both themes.
- Don't write raw hex colours in components, or inline `style="…"` except for values
  computed at runtime (pitch slot positions, chart bar heights).
- Class names are short and lowercase with hyphens (`.sheet-body`, `.tabbar`). Give each
  page's or feature's styles a class prefix (`.game-…`, `.report-…`) and keep them in a `.css`
  file inside that page or feature. Variables, themes and base styles live in `shared/styles/`.
- **`src/app/styles.css` imports every CSS file, in cascade order.** A later file wins over an
  earlier one with the same specificity, so a new file goes in the list where its rules
  belong. The files aren't imported from each module's `.ts`, because then the order would
  depend on the order of the imports in the code.
- **Phone first:** design for about 360–430 px wide, and test at 390×844 (and 360 wide).
  Allow for safe areas (`env(safe-area-inset-*)`). Inputs use at least 16 px text, so the
  iPhone doesn't zoom in when one is tapped.

## Text (I18N)

- **Every string users see is in `I18N` in both `en` and `pt`** (European Portuguese: `tu`
  forms as used today, "equipa" not "time", "golo" not "gol"). TypeScript checks that both
  have the same keys.
- Name keys in camelCase for what they mean (`endHalf`, `reportHint`), not for the English
  wording.
- Format dates and numbers with `locale()` and `toLocaleString`, never by hand. The PDF
  follows the app language.
- Write in plain words for a coach on the touchline: short, no jargon, no "error code".

## Accessibility and touch

- Tap targets are at least **44×44 px** (WCAG 2.2 asks for 24×24 at minimum; 44 is what
  works on a pitch with cold hands).
- Use real `<button>` elements for actions and `<a href="#/…">` for navigation, never a
  clickable `<div>`. A button that shows only an icon or emoji gets an `aria-label` taken
  from `I18N`.
- Contrast: text meets WCAG AA (4.5:1) in **both** themes. The light theme is the one used
  outdoors, so check it carefully.
- Don't show something with colour alone: goals for and against also differ by position,
  cards by icon.
- Anything you can do by drag-and-drop on the game screen must also be possible by tapping.
- The app must work offline. A feature that needs the network says so, and doesn't break
  when there is none.
