// Plain constants with no Convex imports, so both the Next.js client and the
// Convex functions can import them and stay in sync.

export const TOOL_CATEGORIES = [
  "power_tools",
  "hand_tools",
  "garden",
  "kitchen",
  "camping",
  "cleaning",
  "other",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  power_tools: "Power tools",
  hand_tools: "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
};

export const TOOL_CONDITIONS = ["new", "good", "fair", "worn"] as const;
export type ToolCondition = (typeof TOOL_CONDITIONS)[number];

export const CONDITION_LABELS: Record<ToolCondition, string> = {
  new: "New",
  good: "Good",
  fair: "Fair",
  worn: "Worn",
};

export const LIMITS = {
  toolNameMin: 2,
  toolNameMax: 60,
  descriptionMax: 280,
  // Keeps a single request from blocking a tool for months.
  maxLoanDays: 30,
} as const;
