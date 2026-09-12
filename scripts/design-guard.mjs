const RULES = [
  { rule: 'gradient', pattern: /\b(?:repeating-(?:linear|radial|conic)|linear|radial|conic)-gradient\s*\(/gi },
  { rule: 'card-name', pattern: /(?:\.[a-z0-9_-]*card[a-z0-9_-]*\b|class\s*=\s*["'][^"']*\b[a-z0-9_-]*card[a-z0-9_-]*\b[^"']*["'])/gi },
];

export function findDesignViolations(file, source) {
  return RULES.flatMap(({ rule, pattern }) => {
    pattern.lastIndex = 0;
    return Array.from(source.matchAll(pattern), () => ({ file, rule }));
  });
}
