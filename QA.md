# Phase 1 verification

The functional browser checks passed. The performance target remains unmet in the available software-rendering environment. This is a review build, with no claim of release quality or smooth performance on a physical laptop.

## Environment and method

All game code was authored in this session. The only bundled engine dependency is three.js 0.160.0. Textures, reflection faces, geometry, signage, sky, water, and sound are generated locally. The HTML loads one classic script, `game/bundle.min.js`.

Direct `playwright-core` scripts under `/tmp/velvet-test` opened the game over `file://` in the supplied cached Chromium. The final run used Xvfb, ANGLE's validating command decoder, and Mesa llvmpipe software rendering. The viewport was 1280 × 720. Every page request outside `file://` was blocked and recorded. Console errors and page exceptions were collected. Captures came directly from Chromium's screenshot API and were never edited or composited.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Offline file playback | PASS | Zero non-file requests in the successful journey, feature, guard, and final visual runs |
| Browser runtime | PASS | Zero console errors and zero page errors in those runs |
| Start and controls menus | PASS | New Game entered play; Controls expanded and collapsed |
| Walking | PASS | W, A, S, D exercised with measured position changes |
| Sprint and jump | PASS | Shift increased travel; Space raised Mara above the ground and she landed |
| Mouse and minimap | PASS | Dragging changed camera yaw and the minimap's rendered pixels |
| Car interaction | PASS | E entered the nearby Stiletto; E exited after slowing down |
| Five drivable models | PASS | Each model accelerated and its wheel rotation changed |
| Acceleration and steering | PASS | Forward speed increased; A eased steering and changed heading |
| Braking and reverse | PASS | S reduced speed from 12.43 to 4.12 m/s; holding it reached -11 m/s |
| Handbrake | PASS | Space reduced the vehicle's speed |
| Speed-sensitive field of view | PASS | Final measured drive increased field of view from 59 to 63.55 degrees |
| Impact, damage, smoke, camera shake | PASS | A controlled saved fixture began at 45 damage; impact raised it to 60.83, made seven smoke puffs visible, and displaced camera X by 0.0307 while driving straight |
| Bridge ramp | PASS | Driving raised the car to Y = 3.704 at X = 273.157 without damage |
| Bridge visual regression | PASS | A cargo crane obstructed an earlier capture; moving the cranes north cleared the final bridge view |
| Four districts | PASS | Loaded and rendered positions in each district; HUD labels matched |
| Pause and resume | PASS | Escape paused; time and position stayed fixed; Resume returned to play |
| Focus loss | PASS | A blur event paused play and cleared active input |
| Save and Continue | PASS | Reload restored position, money, active car, owned cars, and initial chapter data |
| Health and armor persistence | PASS | Fixtures restored 88 health and 63 armor; money restored as 7,654 |
| Invalid save | PASS | Malformed stored data disabled Continue without a crash |
| Unavailable storage | PASS | F5 displayed the storage failure message without a crash |
| Audio initialization | PASS | WebAudio initialized after New Game |
| Unavailable audio | PASS | A deliberately failing audio constructor did not interrupt play |
| Day/night state | PASS | A save at 22:00 rendered darkness, lit windows, lamps, and vehicle lights; clock advancement was measured |
| Source syntax | PASS | Node syntax checks passed for every authored game module |
| Screenshot limits | PASS | Three real 1280 × 720 JPEGs, each below 256 KiB |
| Entrypoint | PASS | Node 22.23.4 ran twice with network connections and fetch explicitly blocked; both exits were zero |
| Deterministic output | PASS | Both complete output trees and stdout compared byte for byte |
| Vendored dossier library | PASS | SHA-256 matched the kit before and after implementation |
| Performance in available environment | FAIL | 32 frames in 10,296.3 ms: **3.11 FPS** on software rendering |
| Performance on a physical laptop GPU | NOT VERIFIED | No hardware GPU was available |
| Audible sound quality | NOT VERIFIED | Initialization and failure handling were tested; no listening assessment |
| Full twelve-minute cycle in real time | NOT VERIFIED | Clock progression and loaded day/night states were tested separately |

The final Node 22 entrypoint runs took approximately 237 ms and 214 ms, with empty stdout. The output contained the game folder, the three screenshots, and `dossier.json`. The playable folder contained 13 files totaling 606,003 bytes. Temporary output trees and npm build scaffolding were removed after verification.

The unchanged dossier library has SHA-256 `dc67187521b24025ff952f8c231485a6eb92d6d71d29edd2a08154ffb4376129`.

## Screenshot evidence

| File | Content | Size |
| --- | --- | --- |
| `screenshots/1-start-menu.jpg` | Title, New Game / Continue / Controls, and the real city panorama | 102,462 bytes |
| `screenshots/2-on-foot.jpg` | Mara beside a parked car on Coral Boulevard, with HUD, interaction prompt, and minimap | 126,096 bytes |
| `screenshots/3-driving.jpg` | The Stiletto moving along the boulevard, with speed, condition, HUD, and minimap | 133,634 bytes |

## Known limits

Software rendering is too slow for comfortable play. The measured performance gate is not passed, and hardware performance must be assessed before accepting the build. The simulation limits long frame steps to preserve collision stability, so play and the clock slow down under very low frame rates. The software renderer uses reduced internal resolution and a smaller shadow map; the UI and screenshots retain the requested viewport dimensions.

The art is procedural and stylized. Review the real captures for the requested visual bar; no photorealistic claim is made. Geometry batches, instanced palms, windows and lamp heads, nearby-vehicle culling, and infrequent shadow refreshes are implemented, but they have not made this software environment smooth.

No functional failures remain among the exercised Phase 1 paths. Exploration and collision testing sampled the city rather than exhaustively covering every curb, building, and parking space. Traffic, pedestrians, police, missions, and combat are deferred as requested. Chapter progress is an initial chapter-zero save field, with no mission gameplay.

## Authored deliverables

- Root files: `.gitignore`, `README.md`, `QA.md`, `main.ts`, `shots.json`.
- Browser page and bundle: `game/index.html`, `game/bundle.min.js`.
- Game modules: `game/src/audio.js`, `character.js`, `hud.js`, `input.js`, `main.js`, `minimap.js`, `render.js`, `save.js`, `vehicles.js`, `world.js`.
- Engine license notice: `game/vendor/three-license.txt` (the package's required MIT notice).
- The three screenshot files listed above.

Obsolete starter modules `game/src/config.js`, `random.js`, and `shots.js` were removed. The three starter screenshots `1-start.jpg`, `2-play.jpg`, and `3-end.jpg` were replaced.

The authored external test scripts are `inspect.cjs`, `probe.cjs`, `journey.cjs`, `features.cjs`, `visual-final.cjs`, `guards-and-brakes.cjs`, `deny-network.cjs`, and `entrypoint.cjs`, all under `/tmp/velvet-test`. Their result JSON, textual output, and additional real captures are retained there for review. Build tooling was installed temporarily in the repository; test dependencies remain outside it.
