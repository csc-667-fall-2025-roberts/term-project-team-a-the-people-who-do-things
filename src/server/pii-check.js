#!/usr/bin/env node
/* global process, console */
import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".ejs"]);
const IGNORE_FILE = path.join(ROOT, ".piiignore");

const DEFAULT_IGNORE_PATTERNS = ["node_modules", "dist", ".git", ".vite", "build"];

const PII_KEY_PATTERNS = [
  /\bemail\b/i,
  /\bpassword\b/i,
  /\bpassword_hash\b/i,
  /\bdisplayName\b/i,
  /\bdisplay_name\b/i,
  /\buser_id\b/i,
  /\buserId\b/i,
  /\bssn\b/i,
  /\bphone\b/i,
  /\bdob\b/i,
];

const SOCKET_EMIT_OBJECT_REGEX = /\.emit\s*\(\s*['`][^'"`]+['"`]\s*,\s*\{/g;

async function loadIgnorePatterns() {
  try {
    const content = await fs.readFile(IGNORE_FILE, "utf8");
    const patterns = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    return [...DEFAULT_IGNORE_PATTERNS, ...patterns];
  } catch (err) {
    if (err.code === "ENOENT") {
      return DEFAULT_IGNORE_PATTERNS;
    }
    throw err;
  }
}

function shouldIgnore(filePath, baseDir, patterns) {
  const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/");

  return patterns.some((pattern) => {
    const cleanPattern = pattern.startsWith("/") ? pattern.slice(1) : pattern;

    const parts = relativePath.split("/");
    if (parts.some((part) => part === cleanPattern)) {
      return true;
    }

    if (cleanPattern.includes("**")) {
      const regex = new RegExp(
        "^" + cleanPattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$",
      );
      return regex.test(relativePath);
    }

    if (cleanPattern.includes("*")) {
      const regex = new RegExp("^" + cleanPattern.replace(/\*/g, "[^/]*") + "$");
      return regex.test(relativePath) || regex.test(path.basename(filePath));
    }

    if (relativePath === cleanPattern || path.basename(filePath) === cleanPattern) {
      return true;
    }

    if (relativePath.startsWith(cleanPattern + "/")) {
      return true;
    }

    return false;
  });
}

async function walkDir(dir, baseDir, patterns) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (shouldIgnore(full, baseDir, patterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await walkDir(full, baseDir, patterns)));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (ALLOWED_EXTS.has(ext)) files.push(full);
    }
  }

  return files;
}

function lineNumberOfIndex(content, idx) {
  return content.slice(0, idx).split(/\r?\n/).length;
}

function snippetForLine(content, line) {
  const lines = content.split(/\r?\n/);
  const idx = Math.max(0, Math.min(lines.length - 1, line - 1));
  return lines[idx].trim();
}

function shouldIgnoreLine(content, lineNumber) {
  const lines = content.split(/\r?\n/);
  const currentLine = lines[lineNumber - 1];
  const previousLine = lineNumber > 1 ? lines[lineNumber - 2] : null;

  if (currentLine && /\/\/\s*pii-ignore|\/\*\s*pii-ignore/.test(currentLine)) {
    return true;
  }

  if (
    previousLine &&
    /\/\/\s*pii-ignore-next-line|\/\*\s*pii-ignore-next-line/.test(previousLine)
  ) {
    return true;
  }

  return false;
}

async function runScanner() {
  try {
    const ignorePatterns = await loadIgnorePatterns();

    try {
      const st = await fs.stat(SRC_DIR);
      if (!st.isDirectory()) {
        console.error(`Expected '${SRC_DIR}' to be a directory.`);
        process.exit(3);
      }
    } catch {
      console.error(`Source directory '${SRC_DIR}' not found.`);
      process.exit(3);
    }

    const files = await walkDir(SRC_DIR, SRC_DIR, ignorePatterns);
    const findings = [];

    for (const file of files) {
      let content;
      try {
        content = await fs.readFile(file, "utf8");
      } catch {
        continue;
      }

      let match;
      while ((match = SOCKET_EMIT_OBJECT_REGEX.exec(content)) !== null) {
        const ln = lineNumberOfIndex(content, match.index);

        if (shouldIgnoreLine(content, ln)) {
          continue;
        }

        findings.push({
          file,
          line: ln,
          type: "raw-socket-emit",
          snippet: snippetForLine(content, ln),
        });
      }

      for (const pat of PII_KEY_PATTERNS) {
        const rx = new RegExp(pat.source, "gi");
        let m;
        while ((m = rx.exec(content)) !== null) {
          const ln = lineNumberOfIndex(content, m.index);

          if (shouldIgnoreLine(content, ln)) {
            continue;
          }

          findings.push({
            file,
            line: ln,
            type: "pii-key",
            match: m[0],
            snippet: snippetForLine(content, ln),
          });
        }
      }
    }

    if (findings.length === 0) {
      console.log("PII scan: no obvious PII keys or unsafe socket emits found.");
      process.exit(0);
    }

    console.error("PII scan: potential issues found:\n");
    for (const f of findings) {
      if (f.type === "raw-socket-emit") {
        console.error(`${f.file}:${f.line} [RAW_EMIT] ${f.snippet}`);
      } else if (f.type === "pii-key") {
        console.error(`${f.file}:${f.line} [PII_KEY:${f.match}] ${f.snippet}`);
      } else {
        console.error(`${f.file}:${f.line} [${f.type}] ${f.snippet}`);
      }
    }

    console.error(
      `\nReview the above locations. If these are expected (e.g. type definitions or harmless test fixtures), you can ignore them.
Otherwise: sanitize payloads, avoid sending PII over sockets, and ensure any user-identifiable fields are obfuscated or removed before transmission.`,
    );
    process.exit(2);
  } catch (err) {
    console.error("PII scanner encountered an error:", err);
    process.exit(3);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith(path.basename(import.meta.url))) {
  runScanner();
} else {
  runScanner();
}
