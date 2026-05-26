const MINOR_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'for',
  'nor',
  'on',
  'at',
  'to',
  'from',
  'by',
  'with',
  'in',
  'as',
]);

/** Title-case button labels, keeping short words like "to" lowercase. */
export function formatButtonLabel(label: string): string {
  const words = label.split(' ').filter(Boolean);

  return words
    .map((word, index) => {
      if (/^[A-Z0-9&]+$/.test(word) && word.length <= 3) {
        return word;
      }

      const lower = word.toLowerCase();
      if (words.length > 2 && index > 0 && MINOR_WORDS.has(lower)) {
        return lower;
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}
