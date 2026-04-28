export const chatGptSelectors = {
  messages:
    'article, [data-testid^="conversation-turn-"], [data-message-author-role="user"], [data-message-author-role="assistant"]',
  messageRoot: 'article, [data-testid^="conversation-turn-"]',
  messageAuthorRole: "[data-message-author-role]",
  formula: '.katex, .katex-display, math, annotation[encoding="application/x-tex"], [data-latex], [data-tex]',
  latexAnnotation: 'annotation[encoding="application/x-tex"]'
} as const;
