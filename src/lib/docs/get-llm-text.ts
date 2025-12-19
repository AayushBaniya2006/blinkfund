import { source } from "@/lib/docs/source";
import type { InferPageType } from "fumadocs-core/source";

export async function getLLMText(page: InferPageType<typeof source>) {
  // Return basic page info - content extraction removed for compatibility
  return `# ${page.data.title} (${page.url})`;
}
