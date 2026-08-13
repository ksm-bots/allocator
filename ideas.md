# LoneEddy Allocator — Design Direction

## Three initial directions

### Theme Name: Editorial Control Room
Very Brief Intro: A tactile, modernist operations interface that treats allocation as a craft: warm paper, sharp ink, restrained chartreuse signals, and asymmetric data blocks. It feels precise and human rather than generic fintech.
Probability: 0.07

### Theme Name: Quiet Ledger
Very Brief Intro: A calm, monochrome ledger experience with generous whitespace, serif numerals, and subtle ruled-paper cues. It reduces cognitive load by making every decision feel documented and deliberate.
Probability: 0.04

### Theme Name: Signal Field
Very Brief Intro: A high-contrast dark workspace where allocation balance is visualized as luminous flows and live status bands. It is energetic and command-oriented, but intentionally reserved for this one darker direction.
Probability: 0.08

## Chosen direction: Editorial Control Room

### Design Movement
Contemporary Swiss editorial design with references to technical printmaking, operations manuals, and tactile data journalism.

### Core Principles
1. Make the allocation state legible in one scan: status, demand, stock, and action stay above the fold.
2. Turn dense inputs into a calmer rhythm through strong grouping, generous breathing room, and explicit labels.
3. Use contrast sparingly: charcoal anchors the system, warm ivory makes it approachable, and chartreuse marks active signal.
4. Preserve the allocator's rules as visible product logic, not hidden implementation detail.

### Color Philosophy
The interface uses warm ivory as the working surface so the tool feels like a well-kept operations ledger instead of a cold admin template. Charcoal provides the dependable structural frame. Chartreuse is the ownable action color: it appears only where the system is live, balanced, or ready to run. Rust and brick red are reserved for shortage and risk so the states feel meaningful rather than decorative.

### Layout Paradigm
Use an offset split workspace rather than a centered card grid. A narrow left rail explains the workflow and surfaces the current run state; the main canvas holds the seller configuration and allocation preview; supporting summaries sit in a low, editorial “evidence shelf.” On mobile, the rail becomes a compact top status strip and the two primary workspaces stack in process order.

### Signature Elements
1. A thin chartreuse “signal line” that appears in the brand mark, active tabs, progress bars, and result highlights.
2. Fine contour-line textures and ruled surfaces that add depth without competing with data.
3. Small uppercase micro-labels paired with large, high-contrast numerals for fast scanning.

### Interaction Philosophy
Every interaction should answer “what changed?” Inputs update demand and readiness immediately. Run states are explicit and reversible. Export and print remain visible at the result boundary. Placeholder or unavailable actions explain themselves rather than pretending to work.

### Animation
Use short 180–240ms ease-out transitions for hover, focus, and button feedback. Let the main workspace enter with a subtle upward translation and opacity reveal. Stagger metric cards by 40ms. Use a low-amplitude signal-line shimmer only for the active run state. Respect `prefers-reduced-motion` by removing nonessential movement and keeping state changes instant.

### Typography System
Display: `Space Grotesk` for headings, metric numerals, and navigation labels; its geometry gives the interface a confident technical voice.
Body: `DM Sans` for controls, explanatory text, and tables; it stays open at small sizes.
Hierarchy: 11px uppercase tracking for metadata, 14–16px semibold for control labels, 28–54px bold for key metrics, and a restrained 18–24px display scale for section titles. Use tabular numerals for all counts.

### Brand Essence
LoneEddy is a focused allocation control desk for teams who need fairness and balance without losing operational speed.
Personality: exacting, calm, resourceful.

### Brand Voice
Headlines are concise and operational. CTAs are direct verbs. Microcopy explains the rule behind a result instead of filling space with generic reassurance.
Example headline: “Balance the next distribution before it leaves the desk.”
Example CTA: “Run a fair allocation.”

### Wordmark & Logo
Use a compact symbol made from an eddy-like circular path interrupted by a sharp directional wedge. The mark should read as both flow and routing at small sizes. Pair it with a custom-tracked wordmark in Space Grotesk rather than a default logo font.

### Signature Brand Color
Signal Chartreuse: `#D6F45B` — an acid-lime accent softened with warmth, used only for active system signal, positive readiness, and the brand mark.

## Product improvement priorities from the supplied project

1. Replace the heavy blue admin chrome with a calmer visual hierarchy while keeping the dense allocator workflow intact.
2. Make the current run state and demand-versus-stock relationship more immediate and readable.
3. Clarify the two-step process: configure sellers first, then review the allocation output.
4. Surface the algorithm's fairness rules as a concise “allocation logic” panel instead of a long block of copy.
5. Improve responsive behavior so seller rows become usable cards and the results table remains navigable on small screens.
6. Keep the existing Apps Script contract in the frontend: `status`, `allocateBatch`, CSV export, print, reset, and configurable allocation settings.

## Style Decisions

- Prefer warm ivory and charcoal surfaces over generic white-and-blue dashboard conventions.
- Use chartreuse as a restrained live-signal accent, not a decorative gradient.
- Prefer offset, asymmetric compositions over centered card grids.
- Keep algorithm rules visible and concise so fairness is understandable to operators.
