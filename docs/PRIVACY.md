# Privacy

ChatGPT Companion is local-first.

## Page Access

The extension only matches:

```json
"https://chatgpt.com/*"
```

It does not run on other websites.

## Data Handling

- The extension reads the current ChatGPT page DOM only to render the timeline and detect formulas.
- The extension does not upload conversations.
- The extension does not upload copied formulas.
- The extension does not batch collect or export ChatGPT history.
- The extension does not require login beyond the user's normal ChatGPT session.

## Clipboard

When the user clicks a detected formula, the extension writes the extracted LaTeX text to the local clipboard.

## Network

The extension does not make network requests.
