import type { TaskType } from "@sentinelai/core";

const TASK_PATTERNS: Array<{ type: TaskType; patterns: RegExp[] }> = [
  {
    type: "code-generation",
    patterns: [
      /\b(write|create|implement|build|generate|code)\b.*\b(function|class|component|module|api|endpoint|script)\b/i,
      /\b(write|create)\b.*\b(code|program|app)\b/i,
      /\bimplement\b/i,
    ],
  },
  {
    type: "code-review",
    patterns: [
      /\b(review|check|audit|inspect|analyze)\b.*\b(code|diff|pull\s*request|pr|commit)\b/i,
      /\b(find|detect)\b.*\b(bugs?|issues?|errors?|vulnerabilit)/i,
      /\bcode\s*review\b/i,
    ],
  },
  {
    type: "summarization",
    patterns: [
      /\b(summarize|summary|condense|tldr|brief|recap)\b/i,
      /\b(shorten|abbreviate)\b.*\b(text|document|article)\b/i,
    ],
  },
  {
    type: "analysis",
    patterns: [
      /\b(analyze|analyse|evaluate|assess|investigate|research)\b/i,
      /\b(compare|contrast|benchmark)\b/i,
      /\b(explain|why|how\s+does)\b.*\b(work|happen|cause)\b/i,
    ],
  },
  {
    type: "translation",
    patterns: [
      /\b(translate|translation|convert)\b.*\b(to|into|from)\b.*\b(english|spanish|french|german|chinese|japanese|korean|portuguese|arabic|hindi|russian)\b/i,
      /\btranslat/i,
    ],
  },
  {
    type: "extraction",
    patterns: [
      /\b(extract|parse|pull\s*out|identify)\b.*\b(data|information|fields?|entities|names?|dates?|numbers?)\b/i,
      /\bstructured\s*(data|output|format)\b/i,
    ],
  },
  {
    type: "creative",
    patterns: [
      /\b(write|create|compose|draft)\b.*\b(story|poem|essay|blog|article|content|copy|email|letter)\b/i,
      /\b(creative|brainstorm|ideate)\b/i,
    ],
  },
  {
    type: "chat",
    patterns: [
      /\b(hello|hi|hey|help|question|what|who|where|when)\b/i,
    ],
  },
];

export function classifyTask(prompt: string): TaskType {
  for (const { type, patterns } of TASK_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        return type;
      }
    }
  }

  return "chat"; // Default fallback
}
