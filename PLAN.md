# Velvet Harbor v3 plan

## Milestones

0. **Plan and gates:** record this build order, preserve offline/file:// delivery, and keep every gate mandatory.
1. **Phase-2 bug gates:** prove wanted stars decay one per 20 seconds only while real line of sight stays broken; emit a wanted-change/heli-leave event. Prove a cruiser 4 m ahead cannot pin the player, enforce the 15 m forward exclusion, preserve 4 m roadblock gaps, and clear a blocking unit within 3 seconds.
2. **Rename:** use Saltgilt Bay, Prism Heights, Pearlwake Boulevard, Lanternfish Marina, Rustcrane Docks, Opaline Row, Sunwick Hills, Skyfern Airfield, Halberd Point, and Saffron Pier Market everywhere; retain Velvet Harbor, Mara Vale, and the five vehicle names.
3. **Signature look and smoothness:** blue-hour Art Deco, neon, wet streets, light rain, lanterns, reflective physical materials, fixed-step/interpolated simulation, damped camera and animation, pooling and shader precompilation.
4. **Life of the city:** seagulls, pigeons, a high airliner, ferries, sailboats, and the horizon cargo ship.
5. **Pursuit:** Sky Patrol at five stars, dispatch subtitles, wanted news, adaptive music, and passable roadblocks; connect helicopter departure to the milestone-1 wanted event.
6. **Missions and combat:** at least five complete story missions plus melee/pistol combat, enemies, health/armor, and hospital recovery.
7. **Creative extras:** add one at a time only after must-haves pass: Prism Heights monorail, Halberd Point lighthouse beam, tide/flooding, then Saffron Pier Market food carts.
8. **Versioned saves:** write version 2, migrate valid v1 saves and renamed districts, and safely start fresh with a clear message when migration is impossible.

## Cut order

1. Food carts, tide/flooding, lighthouse beam, then monorail.
2. Additional environmental variety beyond the required city-life set.
3. Optional visual variants and nonessential polish, while retaining the blue-hour/rain identity.
4. Never cut bug fixes, typecheck, unit/browser/soak/network/manual checks, dossier checks, or any core feature.

## Session 1 boundary

Complete milestones 0–2 and the save versioning in milestone 8, then rebuild and verify. Do not begin milestones 3–7. Keep Node tests outside `game/` so they are not dossier sources. The coordinator commits after independent verification; this session does not commit or submit.
