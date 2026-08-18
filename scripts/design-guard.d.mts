export type DesignViolation = { file: string; rule: string };
export function findDesignViolations(file: string, source: string): DesignViolation[];
