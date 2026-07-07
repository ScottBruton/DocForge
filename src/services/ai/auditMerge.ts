import type { Block } from '@/schema';

type ListItem = { id: string; text: string; checked?: boolean };

export interface ListItemDiff {
  itemId: string;
  index: number;
  before: string;
  after: string;
}

export interface TextSnippetDiff {
  before: string;
  after: string;
  fullTextAfter: string;
}

export type MergeAuditResult =
  | { ok: true; content: Block['content']; itemDiffs?: ListItemDiff[]; textSnippetDiff?: TextSnippetDiff }
  | { ok: false; reason: string };

export interface MergeAuditOptions {
  excerpt?: string;
}

function isListBlock(block: Block): block is Extract<Block, { type: 'bulletList' | 'numberedList' | 'checklist' }> {
  return block.type === 'bulletList' || block.type === 'numberedList' || block.type === 'checklist';
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findBestMatchingListItem(items: ListItem[], text: string): ListItem | null {
  const norm = normalizeForMatch(text);
  if (!norm) return null;

  let best: { item: ListItem; score: number } | null = null;
  for (const item of items) {
    const itemNorm = normalizeForMatch(item.text);
    let score = 0;
    if (itemNorm === norm) score = 100;
    else if (itemNorm.startsWith(norm.slice(0, 30)) || norm.startsWith(itemNorm.slice(0, 30))) score = 85;
    else if (itemNorm.split(/[\s-]+/)[0] === norm.split(/[\s-]+/)[0]) score = 60;
    if (!best || score > best.score) best = { item, score };
  }
  return best && best.score >= 60 ? best.item : null;
}

function listItemDiffs(before: ListItem[], after: ListItem[]): ListItemDiff[] {
  const diffs: ListItemDiff[] = [];
  for (let i = 0; i < before.length; i += 1) {
    const prev = before[i];
    const next = after[i];
    if (prev && next && prev.text !== next.text) {
      diffs.push({ itemId: prev.id, index: i, before: prev.text, after: next.text });
    }
  }
  return diffs;
}

function mergeListItems(existing: ListItem[], proposed: Array<{ id?: string; text?: string; checked?: boolean }>): ListItem[] | null {
  if (proposed.length === 0) return null;

  // All proposed entries reference existing ids → update those items only.
  if (proposed.every((p) => p.id && existing.some((e) => e.id === p.id))) {
    return existing.map((item) => {
      const upd = proposed.find((p) => p.id === item.id);
      if (!upd) return item;
      return { ...item, ...upd, text: upd.text ?? item.text };
    });
  }

  // Same length without ids → treat as parallel index updates (full list rewrite).
  if (proposed.length === existing.length && proposed.every((p) => p.text != null)) {
    return existing.map((item, i) => ({
      ...item,
      text: proposed[i]!.text!,
      ...(proposed[i]!.checked !== undefined ? { checked: proposed[i]!.checked } : {}),
    }));
  }

  // Fewer items: match each proposed row to one existing item and update in place only.
  if (proposed.length < existing.length) {
    const updates = new Map<string, { text?: string; checked?: boolean }>();

    for (const p of proposed) {
      if (p.id && existing.some((e) => e.id === p.id)) {
        updates.set(p.id, { text: p.text, checked: p.checked });
        continue;
      }
      const match = findBestMatchingListItem(existing, p.text ?? '');
      if (match && !updates.has(match.id)) {
        updates.set(match.id, { text: p.text, checked: p.checked });
      }
    }

    if (updates.size > 0 && updates.size === proposed.length) {
      return existing.map((item) => {
        const upd = updates.get(item.id);
        if (!upd) return item;
        return { ...item, ...upd, text: upd.text ?? item.text };
      });
    }
  }

  return null;
}

function isTextMergeBlock(
  block: Block,
): block is Extract<Block, { type: 'paragraph' | 'quote' | 'heading' }> {
  return block.type === 'paragraph' || block.type === 'quote' || block.type === 'heading';
}

function replaceExcerptInText(fullText: string, excerpt: string, replacement: string): string | null {
  const direct = fullText.indexOf(excerpt);
  if (direct >= 0) {
    return fullText.slice(0, direct) + replacement + fullText.slice(direct + excerpt.length);
  }

  const escaped = excerpt
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const fuzzy = new RegExp(escaped, 'i');
  const match = fullText.match(fuzzy);
  if (match && match.index !== undefined) {
    return fullText.slice(0, match.index) + replacement + fullText.slice(match.index + match[0].length);
  }

  // Match on a meaningful prefix when excerpt has typos (e.g. Reframe vs Refrain)
  const prefix = normalizeForMatch(excerpt).slice(0, Math.min(40, excerpt.length));
  if (prefix.length >= 12) {
    const normFull = fullText.toLowerCase();
    const idx = normFull.indexOf(prefix.slice(0, 20));
    if (idx >= 0) {
      const windowEnd = Math.min(fullText.length, idx + excerpt.length + 40);
      const candidate = fullText.slice(idx, windowEnd);
      const candidateMatch = candidate.match(new RegExp(`^.{${Math.min(20, excerpt.length)},${excerpt.length + 40}}`, 'i'));
      if (candidateMatch) {
        return fullText.slice(0, idx) + replacement + fullText.slice(idx + candidateMatch[0].length);
      }
    }
  }

  return null;
}

function findSentenceToReplace(existingText: string, proposedText: string, excerpt?: string): string | null {
  if (excerpt) {
    const viaExcerpt = replaceExcerptInText(existingText, excerpt, proposedText);
    if (viaExcerpt) return viaExcerpt;
  }

  const sentences = existingText.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const proposedNorm = normalizeForMatch(proposedText);

  // Single long paragraph with no sentence breaks — try excerpt/prefix match on full text.
  if (sentences.length <= 1) {
    const viaPrefix = replaceExcerptInText(
      existingText,
      excerpt ?? proposedText,
      proposedText,
    );
    if (viaPrefix && viaPrefix !== existingText) return viaPrefix;
  }

  for (const sentence of sentences) {
    const sentenceNorm = normalizeForMatch(sentence);
    const sharedPrefix = proposedNorm.slice(0, 25);
    if (sharedPrefix.length >= 12 && sentenceNorm.includes(sharedPrefix.slice(0, 15))) {
      return existingText.replace(sentence, proposedText);
    }
    if (excerpt && sentenceNorm.includes(normalizeForMatch(excerpt).slice(0, 20))) {
      return existingText.replace(sentence, proposedText);
    }
  }

  return null;
}

function expandToWordStart(text: string, index: number): number {
  let i = index;
  while (i > 0 && !/\s/.test(text[i - 1]!)) i -= 1;
  return i;
}

function expandToWordEnd(text: string, index: number): number {
  let i = index;
  while (i < text.length && !/\s/.test(text[i]!)) i += 1;
  return i;
}

export function computeDiffSnippet(before: string, after: string): { before: string; after: string } {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) {
    start += 1;
  }
  let endBefore = before.length;
  let endAfter = after.length;
  while (
    endBefore > start &&
    endAfter > start &&
    before[endBefore - 1] === after[endAfter - 1]
  ) {
    endBefore -= 1;
    endAfter -= 1;
  }

  const wordStart = Math.min(expandToWordStart(before, start), expandToWordStart(after, start));
  const wordEndBefore = expandToWordEnd(before, endBefore);
  const wordEndAfter = expandToWordEnd(after, endAfter);

  const snippetBefore = before.slice(wordStart, wordEndBefore).trim();
  const snippetAfter = after.slice(wordStart, wordEndAfter).trim();
  return {
    before: snippetBefore || before,
    after: snippetAfter || after,
  };
}

function mergeTextField(
  existingText: string,
  proposedText: string,
  options?: MergeAuditOptions,
): { ok: true; text: string; textSnippetDiff: TextSnippetDiff } | { ok: false; reason: string } {
  if (proposedText === existingText) {
    return { ok: false, reason: 'No actual text changes detected in this suggestion.' };
  }

  // Similar length → treat as full text replacement (AI rewrote whole paragraph).
  if (proposedText.length >= existingText.length * 0.65) {
    const diff = computeDiffSnippet(existingText, proposedText);
    return {
      ok: true,
      text: proposedText,
      textSnippetDiff: { before: diff.before, after: diff.after, fullTextAfter: proposedText },
    };
  }

  // Shorter text → surgical phrase/sentence fix only.
  const replaced = findSentenceToReplace(existingText, proposedText, options?.excerpt);
  if (replaced) {
    let snippetBefore = options?.excerpt ?? '';
    if (!snippetBefore || !existingText.includes(snippetBefore)) {
      let start = 0;
      while (start < existingText.length && start < replaced.length && existingText[start] === replaced[start]) {
        start += 1;
      }
      let endA = existingText.length;
      let endB = replaced.length;
      while (endA > start && endB > start && existingText[endA - 1] === replaced[endB - 1]) {
        endA -= 1;
        endB -= 1;
      }
      snippetBefore = existingText.slice(start, endA).trim() || options?.excerpt || existingText;
    }
    return {
      ok: true,
      text: replaced,
      textSnippetDiff: {
        before: snippetBefore,
        after: proposedText,
        fullTextAfter: replaced,
      },
    };
  }

  return {
    ok: false,
    reason: `This suggestion would replace a ${existingText.length}-character paragraph with only ${proposedText.length} characters. It looks like a partial fix — apply is blocked to avoid deleting content. Edit manually or dismiss.`,
  };
}

export function mergeAuditBlockContent(
  block: Block,
  proposedContent: Record<string, unknown>,
  options?: MergeAuditOptions,
): MergeAuditResult {
  if (isListBlock(block) && Array.isArray(proposedContent.items)) {
    const proposedItems = proposedContent.items as Array<{ id?: string; text?: string; checked?: boolean }>;
    const existingItems = block.content.items;
    const mergedItems = mergeListItems(existingItems, proposedItems);

    if (!mergedItems) {
      const removed = existingItems.length - proposedItems.length;
      return {
        ok: false,
        reason:
          removed > 0
            ? `This suggestion would remove ${removed} list item${removed === 1 ? '' : 's'}. Apply is blocked — dismiss and fix references manually, or re-run audit after improving the prompt.`
            : 'This list suggestion could not be applied safely without removing content.',
      };
    }

    const diffs = listItemDiffs(existingItems, mergedItems);
    if (diffs.length === 0) {
      return { ok: false, reason: 'No actual list changes detected in this suggestion.' };
    }

    return {
      ok: true,
      content: { ...block.content, items: mergedItems },
      itemDiffs: diffs,
    };
  }

  // Never allow list blocks to be updated via a stray items array handled above.
  if (isListBlock(block) && 'items' in proposedContent) {
    return { ok: false, reason: 'Invalid list update format.' };
  }

  if (isTextMergeBlock(block) && typeof proposedContent.text === 'string') {
    const textMerge = mergeTextField(block.content.text, proposedContent.text, options);
    if (!textMerge.ok) return textMerge;
    return {
      ok: true,
      content: { ...block.content, text: textMerge.text },
      textSnippetDiff: textMerge.textSnippetDiff,
    };
  }

  if (
    (block.type === 'table' || block.type === 'figure')
    && typeof proposedContent.caption === 'string'
  ) {
    const existingCaption = block.content.caption;
    const proposedCaption = proposedContent.caption;
    if (proposedCaption === existingCaption) {
      return { ok: false, reason: 'No actual caption changes detected in this suggestion.' };
    }
    const beforeDisplay = existingCaption.trim() || '(no caption)';
    const afterDisplay = proposedCaption.trim() || '(no caption)';
    const diff = computeDiffSnippet(beforeDisplay, afterDisplay);
    return {
      ok: true,
      content: { ...block.content, ...proposedContent } as Block['content'],
      textSnippetDiff: {
        before: diff.before,
        after: diff.after,
        fullTextAfter: afterDisplay,
      },
    };
  }

  // Scalar merge for other block types (e.g. equation latex).
  const textKeys = ['text', 'code', 'latex'] as const;
  for (const key of textKeys) {
    if (key in proposedContent && typeof proposedContent[key] === 'string' && key in block.content) {
      const existing = (block.content as Record<string, string>)[key] ?? '';
      const proposed = proposedContent[key] as string;
      if (key === 'text') break; // handled above
      if (proposed.length < existing.length * 0.65) {
        return {
          ok: false,
          reason: 'This suggestion would remove significant content from the block. Apply is blocked.',
        };
      }
    }
  }

  return {
    ok: true,
    content: { ...block.content, ...proposedContent } as Block['content'],
  };
}

export function previewAuditBlockMerge(
  block: Block,
  proposedContent: Record<string, unknown>,
  options?: MergeAuditOptions,
): MergeAuditResult {
  return mergeAuditBlockContent(block, proposedContent, options);
}
