import { sampleArticles } from '@/data/articles';
import type { TemplateItem } from '@/types/template';

export async function listTemplateItems(): Promise<TemplateItem[]> {
  return Promise.resolve(sampleArticles);
}
