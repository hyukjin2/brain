export const NETWORK_LABELS = [
  "Cont",
  "Default",
  "DorsAttn",
  "Limbic",
  "SalVentAttn",
  "SomMot",
  "Vis"
];

export function buildJLabels() {
  const labels = [];
  for (let i = 0; i < NETWORK_LABELS.length; i += 1) {
    for (let j = i + 1; j < NETWORK_LABELS.length; j += 1) {
      labels.push(`${NETWORK_LABELS[i]}-${NETWORK_LABELS[j]}`);
    }
  }
  return labels;
}
