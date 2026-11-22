# Changelog

## 2026-11-22 — Bug A: wanted-level decay

- Wanted decay now requires a real line-of-sight break. Police cruisers and visible officers use distance-limited visibility checks with building occlusion; elapsed time alone does not reduce wanted level.
- While no police or witnesses can see the player, one star is removed per 20 seconds until zero. Reacquiring sight resets the hidden timer, and large clock deltas preserve the exact drop boundaries.
- The HUD refreshes after every drop. Wanted changes emit `velvet:wanted-change` details including `previous`, `wanted`, `time`, `reason`, and `helicopterRequired`; the 5-to-4 event reports `helicopterRequired: false` for the later helicopter lifecycle.
- Added deterministic police controls and HUD snapshots under `window.__vhTest` for browser verification.

### Verification

- `node --test tests/run.mjs`: **3/3 passed**. Five occluded stars dropped at simulation times **20, 40, 60, 80, and 100 seconds**; visible police prevented decay; regained sight reset the timer; all inspected values stayed finite through **10,000 simulation steps**.
- Direct Playwright script with Chromium revision 1148 (Chromium 131), `file://`, and a **1280×720** viewport: forced five stars with `seen: true`, moved beyond police sight range, and observed the live HUD change **5→4→3→2→1→0**. Wanted events were timestamped **20, 40, 60, 80, and 100 seconds**; one-second polling observed the reductions at approximately **19.46, 39.78, 60.16, 80.38, and 100.66 seconds** of wall time. The first interval included part of the frame in progress when the test teleported the player. No fake-time acceleration was used for this observation.
- Browser gates: **0 console errors, 0 page errors, 0 non-file requests**.
- `npx -y -p typescript tsc --noEmit`: **0 errors**. `node main.ts`: **exit 0 within 10 seconds** (tested with an isolated output directory).
- Software rendering: ANGLE/Vulkan SwiftShader measured **0.43 FPS average** over the live decay observation. This is a headless software-rendering result, not a hardware-GPU performance claim.
