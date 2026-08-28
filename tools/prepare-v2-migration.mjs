import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outputDir = path.resolve(process.argv[2] || path.join(repoRoot, "migration-private"));

function extractAssignedJson(filePath, variableName) {
  const source = fs.readFileSync(filePath, "utf8");
  const marker = `const ${variableName}`;
  let cursor = source.indexOf(marker);
  if (cursor < 0) throw new Error(`Missing ${variableName} in ${filePath}`);
  cursor = source.indexOf("=", cursor) + 1;
  while (/\s/.test(source[cursor])) cursor += 1;

  const open = source[cursor];
  const close = open === "[" ? "]" : open === "{" ? "}" : "";
  if (!close) throw new Error(`Unsupported ${variableName} assignment in ${filePath}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = cursor; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(cursor, index + 1));
    }
  }
  throw new Error(`Unterminated ${variableName} assignment in ${filePath}`);
}

function clean(value, max = 1000) {
  return String(value ?? "").trim().replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
}

function validLineUserId(value) {
  const normalized = clean(value, 40);
  return /^U[0-9a-f]{32}$/i.test(normalized) ? normalized : "";
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const studentsSource = extractAssignedJson(
  path.join(repoRoot, "frontend/data/students_data.js"),
  "STUDENTS_DATA",
);
const deedsSource = extractAssignedJson(
  path.join(repoRoot, "frontend/data/deeds_data.js"),
  "IMPORTED_DEEDS",
);

const seenStudentIds = new Set();
const seenLineIds = new Set();
let duplicateLineIdsRemoved = 0;
let invalidLineIdsRemoved = 0;

const students = studentsSource.map((source) => {
  const studentId = clean(source.student_id, 30);
  if (!studentId || seenStudentIds.has(studentId)) {
    throw new Error(`Duplicate or missing student ID: ${studentId || "[empty]"}`);
  }
  seenStudentIds.add(studentId);

  const rawLineId = clean(source.line_user_id, 40);
  let lineUserId = validLineUserId(rawLineId);
  if (rawLineId && !lineUserId) invalidLineIdsRemoved += 1;
  if (lineUserId && seenLineIds.has(lineUserId)) {
    duplicateLineIdsRemoved += 1;
    lineUserId = "";
  }
  if (lineUserId) seenLineIds.add(lineUserId);

  return {
    studentId,
    displayName: clean(source.full_name || `${source.first_name || ""} ${source.last_name || ""}`, 160),
    cohort: clean(source.class_year ? `รุ่น ${source.class_year}` : source.year_level, 30),
    role: "student",
    lineUserId,
  };
});

const seenDeedIds = new Set();
const deeds = [];
let duplicateDeedIds = 0;
let orphanStudentIds = 0;
let summaryRowsOver24Hours = 0;
let evidenceRecords = 0;

for (const source of Object.values(deedsSource).flat()) {
  const legacyId = clean(source.id, 100);
  const studentId = clean(source.studentId, 30);
  if (!legacyId || seenDeedIds.has(legacyId)) {
    duplicateDeedIds += 1;
    continue;
  }
  seenDeedIds.add(legacyId);
  if (!seenStudentIds.has(studentId)) orphanStudentIds += 1;
  if (Number(source.hours) > 24 && /สรุป|สะสม|รวมชั่วโมง/.test(clean(source.description, 1200))) {
    summaryRowsOver24Hours += 1;
  }
  if ((Array.isArray(source.imageUrls) && source.imageUrls.length) || source.pdfUrl) evidenceRecords += 1;

  deeds.push({
    legacyId,
    studentId,
    category: clean(source.category, 120),
    categoryId: Number(source.categoryId) || 0,
    academicYear: clean(source.academicYear, 20),
    activityDate: clean(source.activityDate, 20),
    hours: Number(source.hours) || 0,
    description: clean(source.description, 1200),
    imageUrls: Array.isArray(source.imageUrls) ? source.imageUrls.map((url) => clean(url, 1000)).filter(Boolean) : [],
    pdfUrl: clean(source.pdfUrl, 1000),
    status: clean(source.status, 20),
    submittedAt: clean(source.submittedAt, 60),
    approvedBy: clean(source.approvedBy, 160),
    approvedAt: clean(source.approvedAt, 60),
    rejectReason: clean(source.rejectReason, 500),
    note: clean(source.note, 500),
  });
}

fs.mkdirSync(outputDir, { recursive: true });
const studentsPath = path.join(outputDir, "legacy_students_v2.json");
const deedsPath = path.join(outputDir, "legacy_deeds_v2.json");
const manifestPath = path.join(outputDir, "migration_manifest_v2.json");

fs.writeFileSync(studentsPath, `${JSON.stringify(students, null, 2)}\n`, { mode: 0o600 });
fs.writeFileSync(deedsPath, `${JSON.stringify(deeds, null, 2)}\n`, { mode: 0o600 });

const sourceCommit = process.env.SOURCE_COMMIT || "unknown";
const manifest = {
  version: "2.4.0",
  createdAt: new Date().toISOString(),
  sourceRepository: "anuchit1tube168-cmd/gooddeeds69",
  sourceCommit,
  students: students.length,
  studentsWithLineBinding: students.filter((student) => student.lineUserId).length,
  deeds: deeds.length,
  evidenceRecords,
  totalHours: Number(deeds.reduce((sum, deed) => sum + deed.hours, 0).toFixed(2)),
  qualityFlags: {
    summaryRowsOver24Hours,
    duplicateDeedIds,
    orphanStudentIds,
    invalidLineIdsRemoved,
    duplicateLineIdsRemoved,
    plaintextPasswordsIncluded: false,
    telegramIdentifiersIncluded: false,
  },
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
manifest.sha256 = {
  students: hashFile(studentsPath),
  deeds: hashFile(deedsPath),
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

console.log(JSON.stringify({ outputDir, ...manifest }, null, 2));
