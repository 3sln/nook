import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
const script = resolve(import.meta.dirname, "../scripts/release.mjs");

test("release detection distinguishes version bumps, metadata edits, initial pushes, and manual retries", () => {
  const cwd = mkdtempSync(join(tmpdir(), "nook-version-"));
  try {
    const git = (...args) =>
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    git("init", "-b", "main");
    git("config", "user.name", "Release test");
    git("config", "user.email", "release@example.invalid");
    const write = (version, description = "") =>
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ name: "@3sln/nook", version, description }),
      );
    write("0.1.0");
    git("add", ".");
    git("commit", "-m", "initial");
    const before = git("rev-parse", "HEAD");
    const check = (BEFORE, expected) => {
      const output = join(cwd, "output");
      writeFileSync(output, "");
      execFileSync(process.execPath, [script, "detect"], {
        cwd,
        env: { ...process.env, BEFORE, GITHUB_OUTPUT: output },
      });
      assert.equal(readFileSync(output, "utf8"), `changed=${expected}\n`);
    };
    write("0.1.0", "metadata only");
    check(before, false);
    write("0.2.0");
    check(before, true);
    check("0".repeat(40), true);
    check("", true);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("release publishing uses a verified tarball, resumes safely, and fails closed", () => {
  const cwd = mkdtempSync(join(tmpdir(), "nook-publish-"));
  try {
    const bin = join(cwd, "bin");
    mkdirSync(bin);
    // Fake CLIs exercise orchestration without contacting npm or GitHub.
    const fake = `#!/usr/bin/env node
const fs = require('node:fs');
const name = require('node:path').basename(process.argv[1]);
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify([name,...args])+'\\n');
const mode = process.env.MODE;
if(name==='git') {
 if(args.includes('--verify')) process.exit(mode==='tag-conflict'?0:1);
 console.log(args[0]==='rev-list'?'other-sha':'test-sha');
} else if(name==='npm') {
 if(args[0]==='pack') console.log(JSON.stringify([{ filename:'nook.tgz', shasum:'same' }]));
 if(args[0]==='view') {
  if(['existing','resume','missing-asset'].includes(mode)) console.log(JSON.stringify('same'));
  else if(mode==='mismatch') console.log(JSON.stringify('different'));
  else { console.log(JSON.stringify({error:{code: mode==='network'?'E503':'E404'}})); process.exit(1); }
 }
 if(args[0]==='publish' && mode==='publish-failure') process.exit(1);
} else if(name==='gh' && args[0]==='api') {
 if(['existing','missing-asset'].includes(mode)) console.log(JSON.stringify({html_url:'https://example.invalid/release',draft:false,assets:mode==='existing'?[{name:'nook.tgz'}]:[]}));
 else { console.error('HTTP 404'); process.exit(1); }
}
`;
    for (const name of ["npm", "gh", "git"])
      writeFileSync(join(bin, name), fake, { mode: 0o755 });
    const calls = join(cwd, "calls");
    const check = (mode, version = "0.2.0") => {
      writeFileSync(
        join(cwd, "package.json"),
        JSON.stringify({ name: "@3sln/nook", version }),
      );
      writeFileSync(calls, "");
      const result = spawnSync(process.execPath, [script, "publish"], {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          MODE: mode,
          CALLS: calls,
          PATH: `${bin}:${process.env.PATH}`,
          GITHUB_REPOSITORY: "3sln/nook",
        },
      });
      return {
        result,
        calls: readFileSync(calls, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse),
      };
    };
    let outcome = check("new");
    assert.equal(outcome.result.status, 0, outcome.result.stderr);
    assert(
      outcome.calls.some(
        (args) =>
          args[0] === "npm" &&
          args[1] === "publish" &&
          args.includes("--provenance") &&
          args.at(-1) === "latest",
      ),
    );
    assert(
      outcome.calls.some(
        (args) =>
          args[0] === "gh" &&
          args[1] === "release" &&
          args.includes("test-sha") &&
          args.includes("nook.tgz"),
      ),
    );
    outcome = check("new", "0.3.0-beta.1");
    assert.equal(outcome.result.status, 0, outcome.result.stderr);
    assert(
      outcome.calls.some((args) => args[0] === "npm" && args.at(-1) === "next"),
    );
    assert(outcome.calls.some((args) => args.includes("--prerelease")));
    outcome = check("existing");
    assert.equal(outcome.result.status, 0, outcome.result.stderr);
    assert(
      !outcome.calls.some(
        (args) => args[1] === "publish" || args[1] === "release",
      ),
    );
    for (const mode of [
      "mismatch",
      "network",
      "tag-conflict",
      "publish-failure",
    ]) {
      outcome = check(mode);
      assert.notEqual(outcome.result.status, 0, mode);
      assert(
        !outcome.calls.some(
          (args) => args[0] === "gh" && args[1] === "release",
        ),
        mode,
      );
      if (mode !== "publish-failure")
        assert(!outcome.calls.some((args) => args[1] === "publish"), mode);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
