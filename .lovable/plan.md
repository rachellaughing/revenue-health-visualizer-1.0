Update the `CavitySearchCTA` component in `src/routes/health-check.index.tsx`.

1. Add an internal `open` state using `useState` so the card can be toggled open/closed.
2. Make the header row a clickable button that toggles the state and shows an expand/collapse indicator (chevron).
3. When collapsed, show only the header title "Is this a lot?".
4. When expanded, show the new body copy and the existing "Learn about the Diagnostic™ →" CTA button.
5. Replace the existing two paragraphs with the new single paragraph provided by the user:

> If this feels less like a survey and more like a business cavity search — good. That's the point. We're not trying to figure out which Disney princess you are. This is a thorough exam, with a differential diagnosis.
> Can't answer some of these? Even better. That's what the Revenue Health Diagnostic™ is for — we interview your team, find what nobody documented, and hand you back the business bible for how your revenue actually works.

6. Preserve existing visual styling (dark abyss background, Instrument Serif heading, ember CTA button, rounded corners, padding, and max-width on body text).

No other components or logic will be changed.