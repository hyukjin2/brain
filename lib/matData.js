import fs from "fs";
import path from "path";
import mat4js from "mat4js";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");
const CACHE = new Map();

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (ArrayBuffer.isView(value)) {
    return Array.from(value);
  }

  if (value && typeof value === "object") {
    if (value._data) {
      return normalizeValue(value._data);
    }
    if (value.data && value.size) {
      return normalizeValue(value.data);
    }
  }

  return value;
}

function pickGroupStruct(data, group) {
  const key = `group${group}_combined`;
  if (data[key]) {
    return data[key];
  }
  if (data.group1_combined) {
    return data.group1_combined;
  }
  const firstStruct = Object.values(data).find(
    (value) => value && typeof value === "object" && value.mu && value.beta
  );
  return firstStruct;
}

export function loadMatData(group = 1) {
  const dataDir = process.env.MAT_DATA_DIR || DEFAULT_DATA_DIR;
  const safeGroup = Number.isFinite(group) && group > 0 ? group : 1;
  const fileName = `group${safeGroup}_combined.mat`;
  const filePath = path.join(dataDir, fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`MAT file not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const cached = CACHE.get(filePath);
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    return cached.data;
  }

  const data = mat4js.read(filePath);
  const combined = pickGroupStruct(data, safeGroup);

  if (!combined) {
    throw new Error(`Could not find group${group}_combined struct in MAT file.`);
  }

  const normalized = {
    mu: normalizeValue(combined.mu),
    beta: normalizeValue(combined.beta),
    alpha: normalizeValue(combined.alpha),
    eta: normalizeValue(combined.eta),
    ELBO: normalizeValue(combined.ELBO),
    iter: normalizeValue(combined.iter),
    converged: normalizeValue(combined.converged)
  };

  CACHE.set(filePath, { mtimeMs: stats.mtimeMs, data: normalized });

  return normalized;
}
