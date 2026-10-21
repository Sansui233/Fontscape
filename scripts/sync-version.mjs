// npm version 的 lifecycle hook：把 package.json 的版本同步到 Cargo.toml / Cargo.lock
// tauri.conf.json 的 version 直接指向 package.json，无需同步
import { readFileSync, writeFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));

const replace = (path, pattern) => {
  const text = readFileSync(path, "utf8");
  const next = text.replace(pattern, `$1${version}$2`);
  if (next === text) throw new Error(`version not found in ${path}`);
  writeFileSync(path, next);
};

replace("src-tauri/Cargo.toml", /^(\[package\][\s\S]*?^version = ")[^"]+(")/m);
replace("src-tauri/Cargo.lock", /^(name = "fontscape"\r?\nversion = ")[^"]+(")/m);
