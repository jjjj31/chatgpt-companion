import { FormulaCopyFormat } from "../../shared/types";
import { chatGptSelectors } from "../selectors";

const TOAST_ROOT_ID = "chatgpt-companion-formula-toast";
const HIGHLIGHT_ROOT_ID = "chatgpt-companion-formula-highlight";
const TOAST_TIMEOUT_MS = 1400;

export class FormulaCopyService {
  private readonly format: FormulaCopyFormat;
  private toastTimer: number | null = null;
  private highlightedFormula: Element | null = null;

  constructor(format: FormulaCopyFormat = "latex-raw") {
    this.format = format;
  }

  mount(): void {
    document.addEventListener("click", this.handleDocumentClick, true);
    document.addEventListener("pointerover", this.handlePointerOver, true);
    document.addEventListener("pointerout", this.handlePointerOut, true);
    document.addEventListener("scroll", this.handleViewportChange, true);
    window.addEventListener("resize", this.handleViewportChange);
  }

  destroy(): void {
    document.removeEventListener("click", this.handleDocumentClick, true);
    document.removeEventListener("pointerover", this.handlePointerOver, true);
    document.removeEventListener("pointerout", this.handlePointerOut, true);
    document.removeEventListener("scroll", this.handleViewportChange, true);
    window.removeEventListener("resize", this.handleViewportChange);

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }

    document.getElementById(TOAST_ROOT_ID)?.remove();
    document.getElementById(HIGHLIGHT_ROOT_ID)?.remove();
  }

  private readonly handleDocumentClick = async (event: MouseEvent): Promise<void> => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const formulaElement = this.findFormulaElement(target);

    if (!formulaElement) {
      return;
    }

    const latex = this.extractLatex(formulaElement);

    if (!latex) {
      this.showToast("Copy failed");
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    try {
      await this.copyText(this.formatLatex(latex, formulaElement));
      this.showToast("Formula copied");
    } catch {
      this.showToast("Copy failed");
    }
  };

  private readonly handlePointerOver = (event: PointerEvent): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const formulaElement = this.findFormulaElement(target);

    if (!formulaElement || !this.extractLatex(formulaElement)) {
      this.hideHighlight();
      return;
    }

    this.highlightedFormula = formulaElement;
    this.showHighlight(formulaElement);
  };

  private readonly handlePointerOut = (event: PointerEvent): void => {
    if (!this.highlightedFormula) {
      return;
    }

    const relatedTarget = event.relatedTarget;

    if (relatedTarget instanceof Node && this.highlightedFormula.contains(relatedTarget)) {
      return;
    }

    this.hideHighlight();
  };

  private readonly handleViewportChange = (): void => {
    if (!this.highlightedFormula) {
      return;
    }

    this.showHighlight(this.highlightedFormula);
  };

  private findFormulaElement(target: Element): Element | null {
    if (target.matches(chatGptSelectors.formula)) {
      return target;
    }

    return target.closest(chatGptSelectors.formula);
  }

  private getVisibleFormulaElement(element: Element): Element {
    return element.closest(".katex-display, .katex, math") ?? element;
  }

  private extractLatex(element: Element): string {
    const annotation = this.findLatexAnnotation(element);
    const annotationText = annotation?.textContent?.trim();

    if (annotationText) {
      return annotationText;
    }

    const attributeText =
      element.getAttribute("data-latex") ??
      element.getAttribute("data-tex") ??
      element.getAttribute("aria-label") ??
      "";

    if (attributeText.trim()) {
      return attributeText.trim();
    }

    return (element.textContent ?? "").trim();
  }

  private findLatexAnnotation(element: Element): Element | null {
    if (element.matches(chatGptSelectors.latexAnnotation)) {
      return element;
    }

    return element.querySelector(chatGptSelectors.latexAnnotation);
  }

  private formatLatex(latex: string, element: Element): string {
    if (this.format === "latex-raw") {
      return latex;
    }

    const isBlock = Boolean(element.closest(".katex-display")) || element.matches(".katex-display");
    return isBlock ? `$$${latex}$$` : `$${latex}$`;
  }

  private async copyText(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        this.copyTextWithFallback(text);
        return;
      }
    }

    this.copyTextWithFallback(text);
  }

  private copyTextWithFallback(text: string): void {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Copy failed");
    }
  }

  private showToast(message: string): void {
    const toast = this.getToastElement();
    toast.textContent = message;
    toast.hidden = false;

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }

    this.toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, TOAST_TIMEOUT_MS);
  }

  private showHighlight(element: Element): void {
    const visibleElement = this.getVisibleFormulaElement(element);
    const rect = visibleElement.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      this.hideHighlight();
      return;
    }

    const highlight = this.getHighlightElement();
    const padding = 5;
    highlight.hidden = false;
    highlight.style.left = `${Math.max(8, rect.left - padding)}px`;
    highlight.style.top = `${Math.max(8, rect.top - padding)}px`;
    highlight.style.width = `${rect.width + padding * 2}px`;
    highlight.style.height = `${rect.height + padding * 2}px`;
  }

  private hideHighlight(): void {
    this.highlightedFormula = null;
    const highlight = document.getElementById(HIGHLIGHT_ROOT_ID);

    if (highlight) {
      highlight.hidden = true;
    }
  }

  private getHighlightElement(): HTMLElement {
    const existingHighlight = document.getElementById(HIGHLIGHT_ROOT_ID);

    if (existingHighlight) {
      return existingHighlight;
    }

    const highlight = document.createElement("div");
    highlight.id = HIGHLIGHT_ROOT_ID;
    highlight.hidden = true;
    highlight.style.position = "fixed";
    highlight.style.zIndex = "2147483646";
    highlight.style.pointerEvents = "none";
    highlight.style.border = "1px solid rgb(56 189 248 / 70%)";
    highlight.style.borderRadius = "8px";
    highlight.style.background = "rgb(56 189 248 / 5%)";
    highlight.style.boxShadow = "0 0 0 2px rgb(56 189 248 / 24%), 0 8px 20px rgb(15 23 42 / 10%)";
    highlight.style.transition = "left 80ms ease, top 80ms ease, width 80ms ease, height 80ms ease";

    const label = document.createElement("div");
    label.textContent = "Copy LaTeX";
    label.style.position = "absolute";
    label.style.right = "0";
    label.style.top = "-26px";
    label.style.padding = "5px 7px";
    label.style.borderRadius = "7px";
    label.style.background = "rgb(15 23 42 / 86%)";
    label.style.color = "#ffffff";
    label.style.font = '700 11px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    highlight.appendChild(label);

    document.documentElement.appendChild(highlight);
    return highlight;
  }

  private getToastElement(): HTMLElement {
    const existingToast = document.getElementById(TOAST_ROOT_ID);

    if (existingToast) {
      return existingToast;
    }

    const toast = document.createElement("div");
    toast.id = TOAST_ROOT_ID;
    toast.hidden = true;
    toast.style.position = "fixed";
    toast.style.right = "24px";
    toast.style.bottom = "24px";
    toast.style.zIndex = "2147483647";
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "8px";
    toast.style.background = "#0f172a";
    toast.style.color = "#ffffff";
    toast.style.boxShadow = "0 10px 30px rgb(15 23 42 / 24%)";
    toast.style.font = '600 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    document.documentElement.appendChild(toast);
    return toast;
  }
}
