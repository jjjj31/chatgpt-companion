import { TimelineItem } from "../../shared/types";
import { chatGptSelectors } from "../selectors";
import timelineCss from "./timeline.css?raw";

type TimelineEntry = {
  item: TimelineItem;
  element: HTMLElement;
};

type TimelineFilterMode = "all" | "user";

const ROOT_ID = "chatgpt-companion-timeline-root";
const MESSAGE_ID_ATTRIBUTE = "data-chatgpt-companion-message-id";
const SCAN_DEBOUNCE_MS = 300;

export class TimelineManager {
  private readonly host: HTMLDivElement;
  private readonly shadowRootRef: ShadowRoot;
  private readonly timelineElement: HTMLElement;
  private readonly railElement: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly mutationObserver: MutationObserver;
  private intersectionObserver: IntersectionObserver | null = null;
  private mutationTarget: HTMLElement | null = null;
  private entries: TimelineEntry[] = [];
  private visibleEntries: TimelineEntry[] = [];
  private readonly nodeButtons = new Map<string, HTMLButtonElement>();
  private activeMessageId: string | null = null;
  private scanTimer: number | null = null;
  private lastLoggedCount: number | null = null;
  private entriesSignature = "";
  private filterMode: TimelineFilterMode = "all";

  constructor() {
    this.host = document.createElement("div");
    this.host.id = ROOT_ID;
    this.shadowRootRef = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = timelineCss;

    this.timelineElement = document.createElement("nav");
    this.timelineElement.className = "timeline";
    this.timelineElement.setAttribute("aria-label", "ChatGPT conversation timeline");
    this.timelineElement.hidden = true;

    this.toggleButton = document.createElement("button");
    this.toggleButton.className = "timeline__toggle";
    this.toggleButton.type = "button";
    this.toggleButton.addEventListener("click", () => this.toggleFilterMode());

    this.railElement = document.createElement("div");
    this.railElement.className = "timeline__rail";
    this.timelineElement.append(this.toggleButton, this.railElement);

    this.shadowRootRef.append(style, this.timelineElement);

    this.mutationObserver = new MutationObserver(() => this.scheduleScan());
  }

  mount(): void {
    if (document.getElementById(ROOT_ID)) {
      return;
    }

    if (!document.body) {
      window.setTimeout(() => this.mount(), SCAN_DEBOUNCE_MS);
      return;
    }

    document.documentElement.appendChild(this.host);
    this.attachMutationObserver();
    this.scan();
  }

  destroy(): void {
    this.mutationObserver.disconnect();
    this.intersectionObserver?.disconnect();
    this.mutationTarget = null;
    this.nodeButtons.clear();

    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
    }

    this.host.remove();
  }

  private scheduleScan(): void {
    if (this.scanTimer !== null) {
      window.clearTimeout(this.scanTimer);
    }

    this.scanTimer = window.setTimeout(() => {
      this.scanTimer = null;
      this.scan();
    }, SCAN_DEBOUNCE_MS);
  }

  private scan(): void {
    this.attachMutationObserver();
    const messageElements = this.findMessageElements();

    this.entries = messageElements.map((element, index) => {
      const id = this.ensureMessageId(element, index);
      const role = this.detectRole(element);

      return {
        element,
        item: {
          id,
          role,
          preview: this.createPreview(element, index),
          index
        }
      };
    });

    const nextSignature = this.createEntriesSignature(this.entries);

    if (nextSignature === this.entriesSignature) {
      this.logMessageCount();
      return;
    }

    this.entriesSignature = nextSignature;
    this.render();
    this.observeIntersections();
    this.logMessageCount();
  }

  private findMessageElements(): HTMLElement[] {
    const root = this.getConversationRoot();
    const messageContainers = Array.from(root.querySelectorAll<HTMLElement>(chatGptSelectors.messageContainers));
    const candidates =
      messageContainers.length > 0
        ? messageContainers
        : Array.from(root.querySelectorAll<HTMLElement>(chatGptSelectors.messageAuthors));
    const messageElements: HTMLElement[] = [];
    const seenElements = new Set<HTMLElement>();

    for (const candidate of candidates) {
      const element = this.getMessageRoot(candidate);

      if (!element || seenElements.has(element) || !this.isUsableMessageElement(element)) {
        continue;
      }

      seenElements.add(element);
      messageElements.push(element);
    }

    return messageElements;
  }

  private getMessageRoot(element: HTMLElement): HTMLElement | null {
    if (element.matches(chatGptSelectors.messageRoot)) {
      return element;
    }

    return element.closest<HTMLElement>(chatGptSelectors.messageRoot) ?? element;
  }

  private render(): void {
    this.timelineElement.hidden = this.entries.length === 0;
    this.visibleEntries = this.getVisibleEntries();
    this.renderToggleButton();
    this.railElement.replaceChildren();
    this.nodeButtons.clear();

    const fragment = document.createDocumentFragment();

    for (let visibleIndex = 0; visibleIndex < this.visibleEntries.length; visibleIndex += 1) {
      const entry = this.visibleEntries[visibleIndex];
      const button = document.createElement("button");
      button.className = [
        "timeline__node",
        `timeline__node--${entry.item.role}`,
        entry.item.id === this.activeMessageId ? "timeline__node--active" : ""
      ]
        .filter(Boolean)
        .join(" ");
      button.type = "button";
      button.title = entry.item.preview;
      button.dataset.preview = entry.item.preview;
      button.dataset.messageId = entry.item.id;
      button.style.top = this.getNodePosition(visibleIndex);
      button.setAttribute("aria-label", `Jump to message ${entry.item.index + 1}: ${entry.item.preview}`);
      button.addEventListener("click", () => {
        entry.element.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      this.nodeButtons.set(entry.item.id, button);
      fragment.appendChild(button);
    }

    this.railElement.appendChild(fragment);
  }

  private observeIntersections(): void {
    this.intersectionObserver?.disconnect();

    if (this.visibleEntries.length === 0) {
      const previousActiveMessageId = this.activeMessageId;
      this.activeMessageId = null;
      this.updateActiveNode(previousActiveMessageId, null);
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        const messageId = (visibleEntry.target as HTMLElement).getAttribute(MESSAGE_ID_ATTRIBUTE);

        if (messageId && messageId !== this.activeMessageId) {
          const previousActiveMessageId = this.activeMessageId;
          this.activeMessageId = messageId;
          this.updateActiveNode(previousActiveMessageId, messageId);
        }
      },
      {
        root: null,
        rootMargin: "-35% 0px -45% 0px",
        threshold: [0.1, 0.3, 0.6, 0.9]
      }
    );

    for (const entry of this.visibleEntries) {
      this.intersectionObserver.observe(entry.element);
    }
  }

  private toggleFilterMode(): void {
    this.filterMode = this.filterMode === "all" ? "user" : "all";
    this.render();
    this.observeIntersections();
  }

  private getVisibleEntries(): TimelineEntry[] {
    if (this.filterMode === "user") {
      return this.entries.filter((entry) => entry.item.role === "user");
    }

    return this.entries;
  }

  private renderToggleButton(): void {
    const userOnly = this.filterMode === "user";
    this.toggleButton.textContent = userOnly ? "You" : "All";
    this.toggleButton.title = userOnly ? "Showing only your messages" : "Showing all messages";
    this.toggleButton.setAttribute("aria-label", userOnly ? "Show all messages" : "Show only your messages");
    this.toggleButton.setAttribute("aria-pressed", String(userOnly));
  }

  private ensureMessageId(element: HTMLElement, index: number): string {
    const existingId = element.getAttribute(MESSAGE_ID_ATTRIBUTE);

    if (existingId) {
      return existingId;
    }

    const id = `message-${index}-${Date.now().toString(36)}`;
    element.setAttribute(MESSAGE_ID_ATTRIBUTE, id);
    return id;
  }

  private getNodePosition(visibleIndex: number): string {
    if (this.visibleEntries.length <= 1 || visibleIndex < 0) {
      return "50%";
    }

    return `${(visibleIndex / (this.visibleEntries.length - 1)) * 100}%`;
  }

  private isUsableMessageElement(element: HTMLElement): boolean {
    const text = this.normalizeText(element.textContent || "");
    return text.length > 0;
  }

  private detectRole(element: HTMLElement): TimelineItem["role"] {
    const explicitRole =
      element.getAttribute("data-message-author-role") ??
      element.querySelector<HTMLElement>(chatGptSelectors.messageAuthorRole)?.dataset.messageAuthorRole;

    if (explicitRole === "user" || explicitRole === "assistant") {
      return explicitRole;
    }

    const source = [
      element.getAttribute("data-message-author-role"),
      element.getAttribute("data-testid"),
      element.getAttribute("aria-label"),
      element.textContent?.slice(0, 160)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (source.includes("user") || source.includes("you said")) {
      return "user";
    }

    if (source.includes("assistant") || source.includes("chatgpt")) {
      return "assistant";
    }

    return "unknown";
  }

  private createPreview(element: HTMLElement, index: number): string {
    const text = this.normalizeText(element.textContent || "")
      .replace(/^you said:\s*/i, "")
      .replace(/^chatgpt said:\s*/i, "");

    return text.length > 96 ? `${text.slice(0, 96)}...` : text || `Message ${index + 1}`;
  }

  private normalizeText(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }

  private logMessageCount(): void {
    if (this.lastLoggedCount === this.entries.length) {
      return;
    }

    this.lastLoggedCount = this.entries.length;
    console.log(`[ChatGPT Companion] timeline messages: ${this.entries.length}`);
  }

  private createEntriesSignature(entries: TimelineEntry[]): string {
    return entries.map((entry) => `${entry.item.id}:${entry.item.role}`).join("|");
  }

  private getConversationRoot(): Document | HTMLElement {
    return document.querySelector<HTMLElement>(chatGptSelectors.conversationRoot) ?? document;
  }

  private attachMutationObserver(): void {
    const target = document.querySelector<HTMLElement>(chatGptSelectors.conversationRoot) ?? document.body;

    if (!target || target === this.mutationTarget) {
      return;
    }

    this.mutationObserver.disconnect();
    this.mutationObserver.observe(target, {
      childList: true,
      subtree: true
    });
    this.mutationTarget = target;
  }

  private updateActiveNode(previousId: string | null, nextId: string | null): void {
    if (previousId) {
      this.nodeButtons.get(previousId)?.classList.remove("timeline__node--active");
    }

    if (nextId) {
      this.nodeButtons.get(nextId)?.classList.add("timeline__node--active");
    }
  }
}
