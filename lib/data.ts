import { loadMatData, type MatValue } from "./mat";

export type GroupCombined = {
  mu: number[][];
  beta: number[][];
  alpha: number[];
  eta: number[];
  ELBO: number[];
  iter: number;
  converged: number;
};

function ensureNumberArray(value: MatValue, label: string): number[] {
  if (Array.isArray(value) && typeof value[0] === "number") {
    return value as number[];
  }
  if (Array.isArray(value) && Array.isArray(value[0])) {
    const flattened = (value as number[][]).flat();
    return flattened;
  }
  if (typeof value === "number") {
    return [value];
  }
  throw new Error(`Unexpected data shape for ${label}`);
}

function ensureNumberMatrix(value: MatValue, label: string): number[][] {
  if (Array.isArray(value) && Array.isArray(value[0])) {
    return value as number[][];
  }
  throw new Error(`Unexpected matrix shape for ${label}`);
}

export function getGroupData(): GroupCombined {
  const parsed = loadMatData();
  const group = parsed.group1_combined as Record<string, MatValue> | undefined;
  if (!group) {
    throw new Error("group1_combined not found in MAT file");
  }

  const mu = ensureNumberMatrix(group.mu, "mu");
  const beta = ensureNumberMatrix(group.beta, "beta");
  const alpha = ensureNumberArray(group.alpha, "alpha");
  const eta = ensureNumberArray(group.eta, "eta");
  const ELBO = ensureNumberArray(group.ELBO, "ELBO");
  const iter = ensureNumberArray(group.iter, "iter")[0];
  const converged = ensureNumberArray(group.converged, "converged")[0];

  return { mu, beta, alpha, eta, ELBO, iter, converged };
}
