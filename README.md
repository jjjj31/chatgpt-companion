# ChatGPT Companion

A local-first Chrome extension for ChatGPT.

## Features

- Right-side conversation timeline for the current ChatGPT page.
- Timeline nodes jump to the matching message.
- Timeline toggle for `All` messages or `You` only.
- Active timeline node follows the currently visible message.
- Hover over a formula to reveal a copy affordance.
- Click a formula to copy its LaTeX source.

This project is a clean reimplementation inspired by extension architecture patterns. It does not copy Gemini Voyager source code.

## Screenshots

Screenshots should be added before publishing:

- `docs/screenshots/timeline.png`
- `docs/screenshots/formula-copy.png`

## Installation

```bash
npm install
npm run build
```

The extension output is generated in `dist/`.

## Load Unpacked Extension

1. Open Chrome and go to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this project's `dist/` folder.
5. Open `https://chatgpt.com/`.
6. Open a conversation and confirm the right-side timeline appears.

After source changes, run `npm run build` again and reload the extension in `chrome://extensions`.

## Development

```bash
npm run typecheck
npm run build
```

Key files:

- `manifest.json`: Chrome Manifest V3 config.
- `src/content/index.tsx`: content script entry.
- `src/content/timeline/TimelineManager.ts`: conversation timeline.
- `src/content/formula/FormulaCopyService.ts`: LaTeX copy service.
- `src/content/selectors.ts`: ChatGPT DOM adapter selectors.

## Privacy

The extension is local-first:

- It only runs on `https://chatgpt.com/*`.
- It does not upload conversations.
- It does not read non-ChatGPT pages.
- It does not batch export or collect ChatGPT history.

See `docs/PRIVACY.md` for details.

## Roadmap

See `docs/ROADMAP.md`.

## License

MIT. See `LICENSE`.
