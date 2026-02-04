import fs from "fs";
import path from "path";

const DATA_TYPE = {
  miINT8: 1,
  miUINT8: 2,
  miINT16: 3,
  miUINT16: 4,
  miINT32: 5,
  miUINT32: 6,
  miSINGLE: 7,
  miDOUBLE: 9,
  miINT64: 12,
  miUINT64: 13,
  miMATRIX: 14
};

const ARRAY_CLASS = {
  mxSTRUCT_CLASS: 2,
  mxDOUBLE_CLASS: 6
};

type MatValue = number | number[] | number[][] | Record<string, MatValue>;

type MatVariable = {
  name: string;
  value: MatValue;
};

type DataElement = {
  dataType: number;
  numBytes: number;
  data: Buffer;
  nextOffset: number;
};

function readDataElement(buffer: Buffer, offset: number): DataElement {
  const tag = buffer.readUInt32LE(offset);
  const tagHasSize = (tag & 0xffff0000) !== 0;

  if (tagHasSize) {
    const dataType = tag & 0xffff;
    const numBytes = tag >>> 16;
    const dataStart = offset + 4;
    const data = buffer.slice(dataStart, dataStart + numBytes);
    const nextOffset = offset + 8;
    return { dataType, numBytes, data, nextOffset };
  }

  const dataType = tag;
  const numBytes = buffer.readUInt32LE(offset + 4);
  const dataStart = offset + 8;
  const dataEnd = dataStart + numBytes;
  const data = buffer.slice(dataStart, dataEnd);
  const padding = numBytes % 8 === 0 ? 0 : 8 - (numBytes % 8);
  const nextOffset = dataEnd + padding;
  return { dataType, numBytes, data, nextOffset };
}

function readNumericArray(dataType: number, data: Buffer): number[] {
  const values: number[] = [];
  const length = data.length;
  switch (dataType) {
    case DATA_TYPE.miDOUBLE:
      for (let i = 0; i < length; i += 8) values.push(data.readDoubleLE(i));
      break;
    case DATA_TYPE.miSINGLE:
      for (let i = 0; i < length; i += 4) values.push(data.readFloatLE(i));
      break;
    case DATA_TYPE.miINT32:
      for (let i = 0; i < length; i += 4) values.push(data.readInt32LE(i));
      break;
    case DATA_TYPE.miUINT32:
      for (let i = 0; i < length; i += 4) values.push(data.readUInt32LE(i));
      break;
    case DATA_TYPE.miINT16:
      for (let i = 0; i < length; i += 2) values.push(data.readInt16LE(i));
      break;
    case DATA_TYPE.miUINT16:
      for (let i = 0; i < length; i += 2) values.push(data.readUInt16LE(i));
      break;
    case DATA_TYPE.miINT8:
      for (let i = 0; i < length; i += 1) values.push(data.readInt8(i));
      break;
    case DATA_TYPE.miUINT8:
      for (let i = 0; i < length; i += 1) values.push(data.readUInt8(i));
      break;
    case DATA_TYPE.miINT64:
      for (let i = 0; i < length; i += 8) values.push(Number(data.readBigInt64LE(i)));
      break;
    case DATA_TYPE.miUINT64:
      for (let i = 0; i < length; i += 8) values.push(Number(data.readBigUInt64LE(i)));
      break;
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
  return values;
}

function reshapeColumnMajor(values: number[], dims: number[]): MatValue {
  if (dims.length === 0) return values;
  if (dims.length === 1) return values.slice(0, dims[0]);
  if (dims.length === 2) {
    const [rows, cols] = dims;
    const result: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const index = col * rows + row;
        result[row][col] = values[index];
      }
    }
    return result;
  }
  return values;
}

function readString(data: Buffer): string {
  return data.toString("utf8").replace(/\0/g, "").trim();
}

function parseMatrix(data: Buffer): MatVariable {
  let offset = 0;

  const flags = readDataElement(data, offset);
  const arrayClass = flags.data.readUInt32LE(0) & 0xff;
  offset = flags.nextOffset;

  const dimsElement = readDataElement(data, offset);
  const dims = readNumericArray(dimsElement.dataType, dimsElement.data).map((value) =>
    Math.max(0, Math.trunc(value))
  );
  offset = dimsElement.nextOffset;

  const nameElement = readDataElement(data, offset);
  const name = readString(nameElement.data);
  offset = nameElement.nextOffset;

  if (arrayClass === ARRAY_CLASS.mxSTRUCT_CLASS) {
    const fieldNameLengthElement = readDataElement(data, offset);
    const fieldNameLength = readNumericArray(
      fieldNameLengthElement.dataType,
      fieldNameLengthElement.data
    )[0];
    offset = fieldNameLengthElement.nextOffset;

    const fieldNamesElement = readDataElement(data, offset);
    const fields: string[] = [];
    for (let i = 0; i < fieldNamesElement.numBytes; i += fieldNameLength) {
      const slice = fieldNamesElement.data.slice(i, i + fieldNameLength);
      const field = readString(slice);
      if (field) fields.push(field);
    }
    offset = fieldNamesElement.nextOffset;

    const structValue: Record<string, MatValue> = {};
    const fieldCount = fields.length;
    for (let i = 0; i < fieldCount; i++) {
      const fieldElement = readDataElement(data, offset);
      if (fieldElement.dataType !== DATA_TYPE.miMATRIX) {
        throw new Error("Expected matrix element inside struct field");
      }
      const parsed = parseMatrix(fieldElement.data);
      structValue[fields[i]] = parsed.value;
      offset = fieldElement.nextOffset;
    }

    return { name, value: structValue };
  }

  if (arrayClass === ARRAY_CLASS.mxDOUBLE_CLASS) {
    const realElement = readDataElement(data, offset);
    const values = readNumericArray(realElement.dataType, realElement.data);
    const matrix = reshapeColumnMajor(values, dims);
    return { name, value: matrix };
  }

  throw new Error(`Unsupported array class: ${arrayClass}`);
}

function parseMatFile(buffer: Buffer): Record<string, MatValue> {
  const header = buffer.slice(0, 128);
  const magic = header.slice(124, 128).toString("ascii");
  if (!magic.includes("IM")) {
    throw new Error("Unsupported MAT file: expected v5 format");
  }

  let offset = 128;
  const variables: Record<string, MatValue> = {};

  while (offset < buffer.length) {
    const element = readDataElement(buffer, offset);
    offset = element.nextOffset;

    if (element.numBytes === 0) continue;
    if (element.dataType !== DATA_TYPE.miMATRIX) continue;

    const parsed = parseMatrix(element.data);
    variables[parsed.name] = parsed.value;
  }

  return variables;
}

const cache: {
  path?: string;
  mtime?: number;
  data?: Record<string, MatValue>;
} = {};

export function loadMatData() {
  const filePath = process.env.MAT_PATH || path.join(process.cwd(), "data", "group1_combined.mat");
  const stat = fs.statSync(filePath);
  if (cache.path === filePath && cache.mtime === stat.mtimeMs && cache.data) {
    return cache.data;
  }

  const buffer = fs.readFileSync(filePath);
  const parsed = parseMatFile(buffer);
  cache.path = filePath;
  cache.mtime = stat.mtimeMs;
  cache.data = parsed;
  return parsed;
}

export type { MatValue };
