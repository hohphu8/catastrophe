# Catastrophe 🐈 — one cat, zero regrets.

> **Mèo cam vô tội. Mọi thứ rơi xuống đều là do trọng lực.**

Một mini-game phá đồ, chơi ngay trên trình duyệt. Xây bằng **GyosJS 0.5.6 + HTML/CSS/JavaScript thuần**, Vite chỉ dùng để build static assets. Không React/Vue, không Phaser, không backend, không tài khoản, không tracking.

## Gameplay

- **3 phòng** (phòng khách, nhà bếp, góc làm việc), mỗi phòng 10 món đồ có thể tương tác.
- Click/tap đồ vật trên Canvas, hoặc chọn từ danh sách nút dưới game. Mèo chạy tới, nhảy lên và **tát đồ bay**; vật thể có vận tốc, gia tốc trọng trường, quay và nảy khi chạm sàn.
- **Combo 3.1 giây** tăng multiplier ×1…×9; vật bị văng có thể kéo theo món đồ kế bên.
- **Thanh nghi ngờ:** mỗi cú tát tăng mức nghi ngờ của sen. Tới 100% là bị bắt.
- **Núp:** giảm 48% nghi ngờ, đổi lấy 2 giây, hồi chiêu 9 giây.
- **72 giây/ván.** Phá sạch phòng, hết thời gian, hoặc bị bắt là kết thúc. Chơi lại hoặc đổi phòng ngay.
- Kỷ lục từng phòng, bật/tắt âm thanh (mặc định tắt), ưu tiên giảm chuyển động, chia sẻ điểm qua clipboard.
- **Keyboard:** phím 1–0 để chọn 10 vật phẩm, H để núp, P để pause. Nút mục tiêu ngoài Canvas hỗ trợ bàn phím và thiết bị di động.

## Run locally

Requires Node.js **22+**.

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:4230**.

```bash
npm test
npm run build
npm run preview
```

Preview: **http://127.0.0.1:4231**. Production output: **`dist/`**. Vite's `base: './'` ensures relative runtime asset paths work under `/catastrophe/` on GitHub Pages.

## Publish on GitHub Pages

The included GitHub Actions workflow (`.github/workflows/pages.yml`) installs dependencies, runs Node tests, builds, and uploads `dist/` to Pages on each push to `main`.

1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, choose **Source: GitHub Actions**.
3. Push a new commit or run **Build, test & deploy Catastrophe** under Actions (workflow dispatch).
4. Once the Pages deployment succeeds, visit **https://hohphu8.github.io/catastrophe/**.

GitHub Pages does not host the Vite development server; only the built static files are published. The live URL is valid *after* Pages is enabled and the deployment succeeds.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/model.js` | Pure gameplay state, room data, score/combo, suspicion, cooldown, timer, win/loss |
| `src/scene.js` | Hand-crafted Canvas room art, cached backgrounds, animated cat, target picking, falling objects, collision chains and particles |
| `src/main.js` | **GyosJS** signals, computed HUD, game orchestration, pointer/keyboard, sound, persistence, teardown |
| `index.html` | Declarative GyosJS scope, reactive UI, keyed target list and controls |
| `src/style.css` | Responsive layout, overlays and animations |
| `tests/model.test.js` | Node regression tests for core gameplay rules |

### Why GyosJS instead of drawing UI every frame?

The Canvas game loop runs through `requestAnimationFrame` independently. Game model mutations happen in plain JavaScript; GyosJS signals expose the **coarse-grained HUD and control state**, flushed at ~8 Hz and immediately on player actions. A `*for` list with `g-key` displays ten interactive target buttons. This separation avoids generating reactive DOM updates 60 times per second while still exercising state updates, computed values, event bindings and mount/unmount cleanup.

The room and prop illustrations are drawn with Canvas shapes and platform emoji. No third-party art or audio assets are downloaded at runtime. Audio uses Web Audio oscillators on user interaction and is off by default. `localStorage` stores only preferences and personal bests; its failure doesn't prevent playing.

### Limitations

This is a playful casual game, not a fully general rigid-body engine. Object collisions and impulses are intentionally lightweight. There is no multiplayer, user account, server leaderboard, cloud save, or offline service worker. Reloading mid-round starts a fresh round; only best scores persist.

Built as a [GyosJS](https://gyosjs.dev) dogfood project alongside [Rivergate](https://github.com/hohphu8/rivergate), [Bloomfall](https://github.com/hohphu8/bloomfall) and [Sumboard](https://github.com/hohphu8/sumboard).
