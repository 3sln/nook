import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [pack] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    encoding: "utf8",
  }),
);
const files = new Set(pack.files.map((file) => file.path));
for (const target of Object.values(pkg.exports))
  assert(files.has(target.replace(/^\.\//, "")), `Missing export ${target}`);
for (const file of ["README.md", "LICENSE"])
  assert(files.has(file), `Missing ${file}`);
for (const file of files)
  assert(
    /^(src\/|README\.md$|LICENSE$|package\.json$)/.test(file),
    `Unexpected package file: ${file}`,
  );
console.log(
  `Package verified: ${pkg.name}@${pkg.version}, ${files.size} files, ${pack.unpackedSize} bytes unpacked.`,
);
