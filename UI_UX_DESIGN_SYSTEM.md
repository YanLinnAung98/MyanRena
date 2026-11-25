# MyanRena — International Game UI/UX Direction

## Product art direction

**Positioning:** a premium, welcoming competitive game hub with a distinct Myanmar identity. The interface should feel confident and crafted, not noisy or over-decorated.

**Visual language**
- Deep navy / midnight surfaces establish focus and make game artwork stand out.
- Warm metallic gold is reserved for primary actions, achievement, selected states and important competitive moments.
- Ice blue, violet, emerald and rose distinguish supporting navigation areas without competing with the primary action.
- Layered panels use restrained borders, controlled shadows and subtle highlights. Avoid excessive neon, glow, gradients and tiny all-caps labels.
- Existing village scenes and game-specific artwork remain the emotional identity; UI chrome should frame, not overpower, those scenes.

## UX principles

1. **One obvious next action:** each screen should have a clear primary action, with secondary actions visually quieter.
2. **Stable navigation:** persistent destinations stay in predictable positions on desktop and mobile.
3. **Fast match entry:** choose a game, understand the mode, configure only necessary options, then start.
4. **Information hierarchy:** player identity, score, turn, timer and game state must be scannable before decorative content.
5. **Feedback:** every selection, loading state, error, success and match result needs a clear state change.
6. **Accessible interaction:** keyboard focus is visible, controls have comfortable touch targets, text has adequate contrast, and reduced-motion preferences are respected.
7. **Localization:** Burmese and English labels must preserve hierarchy without clipping or awkward wrapping.
8. **Performance:** prefer reusable SVG/CSS and existing game artwork; avoid unnecessary heavy image requests or effects on low-end devices.

## Screen standards

- **Landing / sign-in:** explain the game proposition immediately, show the available games, keep sign-in/sign-up easy to find, and keep mobile artwork compact.
- **Game Hall:** show each game's unique identity, player count / mode context, concise value proposition and a clear Play action.
- **Match setup:** separate Solo, Multiplayer and Room choices; expose relevant settings progressively; keep rules and a short strategy tip close to the decision.
- **In-match HUD:** player identity and score remain visible, game board remains dominant, chat and forfeit stay secondary, and finished state provides a clear return action.
- **Tournament / leaderboard:** prioritize status, eligibility, participation and ranking data; never imply a live event or reward that the data does not support.
- **Profile:** identity and rank first, stats second, customization and editing actions clearly separated.

## Component rules

- Use the shared `cyber-panel`, `cyber-cta-gold`, `mr-arena-banner`, `mr-page-hero`, `mr-interactive-card` and navigation icon family as the baseline.
- Reserve gold for primary / selected / achievement states; do not make every border gold.
- Keep button labels action-oriented and avoid icon-only controls unless they have an accessible name.
- Use existing game-specific artwork and custom SVG marks rather than generic emoji for game identity.
- Keep all gameplay, matchmaking, scoring and server logic unchanged during visual-only redesigns.

## QA checklist before production

- [ ] TypeScript check and production build pass.
- [ ] Desktop widths: 1280px and 1440px.
- [ ] Mobile widths: 360px, 390px and 430px; safe-area and bottom navigation.
- [ ] Burmese and English: no clipped labels, overflow or unreadable line heights.
- [ ] Keyboard focus, disabled, loading, error, empty and success states.
- [ ] Solo, matchmaking, room, tournament entry and active-match flows still work.
- [ ] Reduced-motion and low-graphics settings remain usable.
- [ ] Production smoke test verifies landing, lobby, setup and an actual playable match.

## Competitive reference principles

The direction is informed by public Riot Games and Supercell material around intuitive navigation, readable information, cohesive visual language, polished interaction feedback, and end-to-end player flows. MyanRena should apply those principles with original assets and its own Myanmar-inspired identity rather than copy another game's interface.
