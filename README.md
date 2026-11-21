# Catastrophe 2 🐈 — The Great Cat Escape

**Bad cat. Good game.** A hand-drawn 2D browser platform game: run, jump, swat breakable objects, steal fish, evade your human, and escape through the pet door.

Built from **plain HTML, CSS, JavaScript, Canvas 2D and GyosJS 0.5.6**. Vite is the static bundler. No Phaser, React, backend or game engine.

## Play

1. Hit **Bắt đầu quậy**. Control the orange cat with **A / D** or **← / →** to walk.
2. **W / Space / ↑** to jump onto platforms. **J / K / X** to swat objects within reach and **in front of your cat**. Heavy objects need **two hits**. Clicking the scenery will **not** move the cat or give free points.
3. Chain successful breaks within **4.1 seconds** for higher multipliers. Three or more combos temporarily trigger **Zoomies**.
4. Eat fish floating near the shelves. Reach each room's breaking/fish objective and run to the **far-right pet door** to escape.
5. The owner patrols the room and becomes suspicious from swats, sight and contact. **Hold C / S** in either green **NÚP** zone on the ground to stay hidden. **Hold Shift** to sprint. Each room has a **95-second** clock.
6. Complete the **living room, kitchen, then home office** to win. Cleared rooms unlock for replay.

On phones and tablets use the visible **hold-to-move arrow buttons**, plus **JUMP**, **SMACK**, **NÚP** (hold to crouch), and **SPRINT** buttons. Landscape mode provides a larger playfield.

### Sound

An **original 110 BPM synthesized soundtrack** plays through Web Audio when gameplay starts. It has chords, bass, lead melody and percussion, synthesized in the browser with no audio files. Swats, shattering, fish collection, jump, detection, winning and losing have their own layered sound effects.

Audio is unlocked by the start button (per browser autoplay policy). **Music and effects have independent volume sliders** under the ⚙ settings menu; defaults are 68% / 90%. Use the 🔊/🔇 toggle to mute. Browser preferences are stored locally.

## Develop

Node.js **22+** required.

```bash
npm install
npm run dev
# http://127.0.0.1:4230

npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Preview `dist/` with `npm run preview` on http://127.0.0.1:4231.

## Publish to GitHub Pages

Vite builds relative asset paths (`base: './'`) suitable for `/catastrophe/`. The included `.github/workflows/pages.yml` builds, runs unit tests and Chromium browser smoke tests, then deploys `dist/`.

On GitHub, choose **Settings → Pages → Source: GitHub Actions**, then re-run the workflow under **Actions** if needed.

**https://hohphu8.github.io/catastrophe/**

No server, API keys, accounts or cloud leaderboard are required. Saves are limited to the best score, unlocked chapters and audio preferences. Gameplay state is not persisted mid-round.

## Architecture and GyosJS dogfood

| Module | Responsibility |
| --- | --- |
| `src/model.js` | Pure game simulation: platform physics, player movement, combos, owner patrol and line-of-sight, stealth, fish, level objectives |
| `src/scene.js` | Cached hand-drawn Canvas environments, character illustrations, custom objects, enemy vision cone, particle effects and camera |
| `src/audio.js` | Procedural original music, layered Web Audio effects, unlock/resume/mute and separate master buses |
| `src/main.js` | GyosJS scope, reactive HUD/computed values, game phases, keyboard/touch controls, preferences, cleanup |
| `index.html` | GyosJS declarative HUD, menus and unlockable chapter cards, responsive gamepad |
| `tests/` | Pure Node rules regression tests and Playwright desktop/mobile gameplay checks |

**Game simulation and rendering deliberately do not rely on high-frequency DOM reactivity.** The Canvas runs in requestAnimationFrame, simulation uses fixed substeps (up to 16ms), and GyosJS signals publish coarser HUD changes at ~10Hz and on important events. This tests the intended separation between reactive application state and performance-sensitive work.

The original clicker prototype was replaced after playtesting feedback: there is now direct movement and jumping, hit-range checks, objectives/escape, a patrolling owner, original music and a much richer vector game world.

### Current limitations

- Lightweight handcrafted physics and patrol rather than a full rigid-body engine.
- The art is vector Canvas, not sprite-sheet animation. Some object silhouettes are intentionally stylized.
- Single-player only. No online leaderboard or multiplayer.
- Best scores are browser-local, not transferable between devices.
- Audio requires a user gesture, and can be suspended by an inactive tab.

Built to explore [GyosJS](https://gyosjs.dev) alongside [Rivergate](https://github.com/hohphu8/rivergate), [Bloomfall](https://github.com/hohphu8/bloomfall), and [Sumboard](https://github.com/hohphu8/sumboard).
