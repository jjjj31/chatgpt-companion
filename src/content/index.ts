import { FormulaCopyService } from "./formula/FormulaCopyService";
import { TimelineManager } from "./timeline/TimelineManager";

console.log("[ChatGPT Companion] content script loaded");

function mountContentScript() {
  const timelineManager = new TimelineManager();
  const formulaCopyService = new FormulaCopyService();

  timelineManager.mount();
  formulaCopyService.mount();
}

mountContentScript();
