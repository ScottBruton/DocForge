import type { ReactNode } from 'react';

const HIGHLIGHT_REMOVE = 'rounded-sm bg-red-900/50 px-0.5 text-red-200 ring-1 ring-red-800/60';
const HIGHLIGHT_ADD = 'rounded-sm bg-green-900/50 px-0.5 text-green-200 ring-1 ring-green-800/60';

function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function findHighlightRange(text: string, needle: string): { start: number; end: number } | null {
  if (!needle.trim()) return null;

  const direct = text.indexOf(needle);
  if (direct >= 0) return { start: direct, end: direct + needle.length };

  const escaped = needle
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  const fuzzy = new RegExp(escaped, 'i');
  const match = text.match(fuzzy);
  if (match && match.index !== undefined) {
    return { start: match.index, end: match.index + match[0].length };
  }

  const prefix = normalizeForMatch(needle).slice(0, 20);
  if (prefix.length >= 10) {
    const idx = text.toLowerCase().indexOf(prefix);
    if (idx >= 0) {
      const end = Math.min(text.length, idx + needle.length + 20);
      return { start: idx, end };
    }
  }

  return null;
}

const DEFAULT_CONTEXT_RADIUS = 160;

function snapContextStart(text: string, index: number, radius: number): number {
  const minStart = Math.max(0, index - radius);
  let start = minStart;
  const slice = text.slice(minStart, index);
  const sentenceBreak = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('\n'),
  );
  if (sentenceBreak >= 0) {
    const candidate = minStart + sentenceBreak + (slice[sentenceBreak] === '\n' ? 1 : 2);
    if (index - candidate <= radius + 40) start = candidate;
  }
  return start;
}

function snapContextEnd(text: string, index: number, radius: number): number {
  const maxEnd = Math.min(text.length, index + radius);
  let end = maxEnd;
  const slice = text.slice(index, maxEnd);
  const sentenceBreak = Math.min(
    ...['. ', '! ', '? ', '\n']
      .map((sep) => {
        const idx = slice.indexOf(sep);
        return idx >= 0 ? index + idx + sep.length : text.length;
      }),
  );
  if (sentenceBreak < text.length && sentenceBreak - index <= radius + 40) {
    end = sentenceBreak;
  }
  return end;
}

/** Return a readable window of text around a highlight needle. */
export function extractContextAround(
  text: string,
  needle: string,
  radius = DEFAULT_CONTEXT_RADIUS,
): { context: string; highlight: string; truncatedStart: boolean; truncatedEnd: boolean } {
  if (!text.trim()) {
    return { context: text, highlight: needle, truncatedStart: false, truncatedEnd: false };
  }

  const range = findHighlightRange(text, needle);
  if (!range) {
    if (text.length <= radius * 2) {
      return { context: text, highlight: needle, truncatedStart: false, truncatedEnd: false };
    }
    return {
      context: text,
      highlight: needle,
      truncatedStart: false,
      truncatedEnd: false,
    };
  }

  const start = snapContextStart(text, range.start, radius);
  const end = snapContextEnd(text, range.end, radius);
  const highlight = text.slice(range.start, range.end);

  return {
    context: text.slice(start, end),
    highlight,
    truncatedStart: start > 0,
    truncatedEnd: end < text.length,
  };
}

export function ContextualChangePreview({
  fullText,
  changedText,
  compareText,
  variant,
  className = 'text-xs leading-relaxed',
}: {
  fullText: string;
  changedText: string;
  compareText?: string;
  variant: 'remove' | 'add';
  className?: string;
}) {
  const { context, highlight, truncatedStart, truncatedEnd } = extractContextAround(fullText, changedText);
  const range = findHighlightRange(context, highlight);
  const snippetBefore = variant === 'remove' ? changedText : (compareText ?? changedText);
  const snippetAfter = variant === 'add' ? changedText : (compareText ?? changedText);

  if (!range) {
    return (
      <span className={className}>
        {truncatedStart && <span className="text-zinc-600">…</span>}
        <PhraseWordDiff before={snippetBefore} after={snippetAfter} side={variant === 'remove' ? 'before' : 'after'} />
        {truncatedEnd && <span className="text-zinc-600">…</span>}
      </span>
    );
  }

  const prefix = context.slice(0, range.start);
  const suffix = context.slice(range.end);
  const side = variant === 'remove' ? 'before' : 'after';

  return (
    <span className={className}>
      {truncatedStart && <span className="text-zinc-600">…</span>}
      {prefix && <span className="text-zinc-500">{prefix}</span>}
      <PhraseWordDiff before={snippetBefore} after={snippetAfter} side={side} />
      {suffix && <span className="text-zinc-500">{suffix}</span>}
      {truncatedEnd && <span className="text-zinc-600">…</span>}
    </span>
  );
}

export function HighlightedSubstring({
  text,
  highlight,
  variant,
  className = 'text-xs leading-relaxed',
}: {
  text: string;
  highlight: string;
  variant: 'remove' | 'add';
  className?: string;
}) {
  const range = findHighlightRange(text, highlight);
  if (!range) {
    return <span className={className}>{text}</span>;
  }

  const markClass = variant === 'remove' ? HIGHLIGHT_REMOVE : HIGHLIGHT_ADD;
  return (
    <span className={className}>
      {text.slice(0, range.start)}
      <mark className={markClass}>{text.slice(range.start, range.end)}</mark>
      {text.slice(range.end)}
    </span>
  );
}

/** Highlight words that differ between two similar phrases. */
export function PhraseWordDiff({
  before,
  after,
  side,
  className = 'text-xs leading-relaxed',
}: {
  before: string;
  after: string;
  side: 'before' | 'after';
  className?: string;
}) {
  const beforeWords = before.split(/\s+/).filter(Boolean);
  const afterWords = after.split(/\s+/).filter(Boolean);

  let prefix = 0;
  while (
    prefix < beforeWords.length &&
    prefix < afterWords.length &&
    beforeWords[prefix]!.toLowerCase() === afterWords[prefix]!.toLowerCase()
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < beforeWords.length - prefix &&
    suffix < afterWords.length - prefix &&
    beforeWords[beforeWords.length - 1 - suffix]!.toLowerCase() ===
      afterWords[afterWords.length - 1 - suffix]!.toLowerCase()
  ) {
    suffix += 1;
  }

  const words = side === 'before' ? beforeWords : afterWords;
  const other = side === 'before' ? afterWords : beforeWords;
  const start = prefix;
  const end = words.length - suffix;

  const nodes: ReactNode[] = [];
  for (let i = 0; i < words.length; i += 1) {
    if (i > 0) nodes.push(' ');
    const word = words[i]!;
    const otherWord = other[i];
    const changed = i >= start && i < end && word.toLowerCase() !== otherWord?.toLowerCase();
    if (changed) {
      nodes.push(
        <mark key={i} className={side === 'before' ? HIGHLIGHT_REMOVE : HIGHLIGHT_ADD}>
          {word}
        </mark>,
      );
    } else {
      nodes.push(<span key={i} className={side === 'before' ? 'text-zinc-400' : 'text-zinc-200'}>{word}</span>);
    }
  }

  return <span className={className}>{nodes}</span>;
}

export function ListItemDiffHighlight({
  before,
  after,
  side,
}: {
  before: string;
  after: string;
  side: 'before' | 'after';
}) {
  if (before === after) {
    return <span className="text-xs text-zinc-400">{before}</span>;
  }
  return (
    <PhraseWordDiff
      before={before}
      after={after}
      side={side}
      className="text-xs leading-relaxed"
    />
  );
}
