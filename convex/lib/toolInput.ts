import { LIMITS, type ToolCategory, type ToolCondition } from "./constants";
import { fail } from "./errors";

export type ToolInput = {
  name: string;
  category: ToolCategory;
  condition: ToolCondition;
  description: string;
};

export function cleanToolInput(input: ToolInput): ToolInput {
  const name = normalizeText(input.name);
  const description = normalizeText(input.description);

  if (name.length < LIMITS.toolNameMin || name.length > LIMITS.toolNameMax) {
    fail(
      "INVALID_INPUT",
      `Name must be ${LIMITS.toolNameMin}–${LIMITS.toolNameMax} characters.`,
    );
  }
  if (description.length > LIMITS.descriptionMax) {
    fail(
      "INVALID_INPUT",
      `Description must be at most ${LIMITS.descriptionMax} characters.`,
    );
  }
  return { ...input, name, description };
}

function normalizeText(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
