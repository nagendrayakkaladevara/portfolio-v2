# Design specification

## Reference and fidelity

References inspected: https://kamran.fyi/, https://kamran.fyi/posts, https://kamran.fyi/posts/to-slop-or-not-to-slop and a longer article with desktop contents navigation. Measurements describe the observed reference at inspection; its author may later change the site.

The goal is matching its restrained layout, typography, spacing, muted palette, understated controls, title/date lists, and reading experience, populated with Nagendra’s own content. Do not copy the reference author’s personal claims, biography, article bodies, or identity assets. The supplied headshot is used unchanged with CSS cropping.

Visual comparison of the implemented site in a browser remains a release check. Numeric measurements and implementation review do not establish pixel-perfect parity.

## Layout measurements

All maximum widths below include padding because `box-sizing: border-box` is global.

| Element | Desktop | Mobile |
| --- | --- | --- |
| Home wrapper | max 560px; 24px sides; 128px top/bottom | Same max; 96px top; 20px sides below 360px |
| Archive wrapper | max 600px; 24px sides; 112px top/bottom | 24px sides; 80px top/bottom below 640px |
| Article wrapper | max 672px; 24px sides; 112px top/bottom | 24px sides; 80px top/bottom below 640px |
| Home avatar | 48×48px, circular; object-fit cover; object-position 50% 25% | Same |
| Header identity gap | 16px | Same |
| Home section gap | 56px | Existing responsive rules retained |
| Back navigation | 14px / 20px; muted; small return icon | Same |
| Archive H1 | 20px / 28px, weight 600; 32px after back link | Same |
| Archive introduction | 16px / 24px, muted; 4px top | Same |
| Archive section | 40px above; uppercase category label | Same |
| Archive rows | 6px vertical; title16/24, date14/20 | title15/24 and date12/20 below640px |
| Article title | 20px / 27.5px, weight600 | Same |
| Article body | 16px / 28px; 32px after header | Same |
| Article H2 | 16px / 28px weight600; 32px top | Same |
| Paragraph gap | 12px | Same |
| Article sidebar | fixed left32px, top64px, width192px; contents starts24px below back link | Back link flows above title; contents hidden |

The reference’s desktop sidebar begins around 1024px. This implementation uses 1200px to prevent the 192px sidebar overlapping the centered 672px reading column on narrower screens. This is an explicit responsive deviation. Match the larger desktop arrangement and the inline mobile back link, not an overlapping tablet layout.

## Typography and tokens

Self-host Geist Variable. Weights 400, 500 and 600; avoid decorative display typography. Home identity17/25.5 weight500, role14/21, intro17/28.9, section labels12/18 with .16em letter-spacing, project titles14/21 weight500, project descriptions13.5/20.9. Code uses system monospace.

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#ffffff` | `#0c0a09` |
| Foreground | `#171717` | `#f5f5f4` |
| Body | `#262626` | `#e7e5e4` |
| Secondary text | `#404040` | `#d6d3d1` |
| Muted | `#737373` | `#a8a29e` |
| Faint | `#949494` | `#85807c` |
| Border | `#e5e5e5` | `#292524` |
| Divider | `#ededed` | `#292524` |
| Surface | `#fafafa` | `#1c1917` |
| Hover | `#f4f4f4` | `#25211f` |
| Hover border | `#d4d4d4` | `#44403c` |

Faint small text follows the reference tone and needs contrast review before a WCAG AA claim; promote essential instructions to muted/body tokens if the measured contrast fails. Avoid communicating sample/demo status only through color.

## Components and behavior

- **Theme control:** small outlined circular button fixed near the top-right; moon/sun icon; accessible changing label; persisted local preference, falling back to system preference. Theme bootstraps before React to reduce flash.
- **Homepage Writing:** latest five, title left/date right, thin horizontal dividers, muted dates, “All writing” arrow link. Sample note is small but readable.
- **Archive:** semantic list of full-row links. Title/date separated by a flexible dotted rule. Long titles wrap without pushing dates offscreen. Hover underlines the title. Category label “Articles”; no cards or hero banner.
- **Article:** date below title, optional sample note, readable body, H2 anchors derived from the Markdown AST, duplicate-safe IDs, desktop contents links. Page owns the only H1; Markdown H1 is demoted. Back link is persistent on larger screens.
- **Markdown:** paragraphs, emphasis, links, H2–H4, lists, blockquotes, rules, GFM tables and fenced code. Code and tables scroll horizontally within the column. Code has no heavyweight syntax highlighting in this version. Images need declared metadata and reserve their intrinsic aspect ratio; captions are centered. Raw HTML is skipped; remote undeclared images show a fallback.
- **shadcn/ui:** owned local Avatar, Button, Badge, Card and Dialog components retain accessibility primitives; apply site-specific tokens and sizes. Text lists and prose use semantic HTML rather than forcing card components into the reference design.
- **Motion:** restrained section entrances and UI transitions; reduced-motion preference respected through MotionConfig and CSS. Do not animate reading position or continually animate the portrait.
- **Sound:** UI SFX is loaded for deliberate interface cues; disabled initially and enabled by the footer toggle. No hover sounds or automatic playback. Sound is supplementary to visible state.

## States and accessibility

| Surface | Loading | Empty | Failure |
| --- | --- | --- | --- |
| Home Writing | Three skeleton rows and live status | “Nothing published yet. More soon.” | Alert text + retry |
| Archive | Same skeleton | Same empty copy | Retry; existing successful pages remain visible after next-page failure |
| Article | Back link and loading status | Unknown/unpublished slug uses not-found | Retry for transport/server failures; 404 has return links |
| Image | Reserved dimensions, browser lazy loading | Missing declaration has text fallback | No private URL substitution |
| App render | — | — | Root boundary provides reload link |

Use semantic `main`, one page H1, logical section hierarchy and a keyboard skip link. Focus main after route changes; preserve anchor navigation. Every button needs a visible label or aria-label. Dialogs trap/restore focus through Radix. Focus rings remain visible in both themes. No information depends on motion, audio, hover, or color alone. Long article titles, 200% zoom and 320px widths must be reviewed in-browser.

## Visual acceptance matrix

Review 360×800, 390×844, 768×1024, 1024×768, and 1440×1000. At each relevant size inspect home/archive/article, light/dark, sample labels, long titles, image aspect ratios, code overflow and focus. Compare reference and implementation at the same viewport. Confirm column bounds within 2px, key font sizes/line heights exact, no horizontal page overflow, intentional responsive deviation as above. Browser and screen-reader checks remain outstanding in this environment.

## CRT companion and chat

The code-native vector CRT uses a warm ivory casing, deep green screen, pale pixel eyes, small feet and simple hands. Desktop launcher94×102px, fixed20px from right and14px from bottom with safe-area support; mobile74×86px at12px/right and10px/bottom. Its small “Ask about me” hint replaces a large floating action button. Subtle4.5s float and occasional blink stop under reduced motion.

The shadcn Dialog sits bottom-right at24px,400px wide and at most596px tall, bounded by the visible viewport. On mobile it has12px side margins and at most620px height. Fine borders,16px radius, a light backdrop and modest shadow match the portfolio. Header14px, messages13/21, source chips10px, welcome title27px. Mobile input16px avoids unwanted browser zoom. Safe-area and visual viewport handling keep the composer above the keyboard.

Header: mini CRT, title, assistant/demo label, New chat and Close. Empty state: quiet greeting and four suggested questions. Transcript: right-aligned subdued user bubbles, left-aligned assistant prose, small source chips; no neon glow or dense toolbar. Composer: multiline input, Send/Stop, meaningful demo/AI disclaimer. Loading, offline/error, disabled, stopped and incomplete states stay within the panel. Scroll follows the stream only while near the bottom. Focus trap/restoration and Escape come from Radix. Browser review must add chat open/closed, long transcript, keyboard, source navigation, stop/retry and reduced-motion cases.


## CRT and agent update · 8 October 2026
Use the exact Koboyo CRT direction/reaction WebP sheets, attributed under MIT. Launcher text “Ask about Sai”; chat identity “AI Agent”. Keep explicit demo disclosure until live AI exists. Bottom-right dialog must override both `transform` and Tailwind’s individual `translate` property. Full-height flex shell keeps composer anchored with transcript overflow. Mobile launcher is 84px plus a readable pill; safe-area insets and visual viewport keep the chat within the visible screen. Header controls are 40px; suggestions at least44px. Generated OG preview and vector S monogram extend the neutral/sage palette.


### Mobile chat height
On phones, use all of the visual viewport height minus 12px top and bottom gutters, covering the profile heading behind the dialog. Remove the former 620px mobile cap. Recompute when the keyboard opens; the desktop cap remains596px.
