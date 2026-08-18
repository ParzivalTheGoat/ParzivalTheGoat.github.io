const RULES = [
  { rule: 'gradient', pattern: /\b(?:linear|radial|conic|repeating-linear|repeating-radial)-gradient\s*\(/gi },
  { rule: 'border-radius', pattern: /\bborder(?:-[a-z]+)?-radius\s*:/gi },
  { rule: 'card-name', pattern: /(?:\.[a-z0-9_-]*card[a-z0-9_-]*\b|class\s*=\s*["'][^"']*\b[a-z0-9_-]*card[a-z0-9_-]*\b[^"']*["'])/gi },
];

export function findDesignViolations(file, source) {
  return RULES.flatMap(({ rule, pattern }) => {
    pattern.lastIndex = 0;
    return Array.from(source.matchAll(pattern), () => ({ file, rule }));
  });
}
