export type TimelineItem = {
  id: string;
  role: "user" | "assistant" | "unknown";
  elementPath?: string;
  preview: string;
  index: number;
};

export type FormulaCopyFormat = "latex-with-dollar" | "latex-raw";
