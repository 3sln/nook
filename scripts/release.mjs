import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
const run = (command, args) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?(?:\+[\da-zA-Z.-]+)?$/.test(pkg.version))
  throw new Error("Invalid package version");
if (process.argv[2] === "detect") {
  let previous;
  const before = process.env.BEFORE;
  if (before && !/^0+$/.test(before))
    previous = JSON.parse(
      run("git", ["show", `${before}:package.json`]),
    ).version;
  const changed = previous !== pkg.version;
  appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  console.log(
    `${previous ?? "(initial/manual release)"} → ${pkg.version}: ${changed ? "release" : "skip"}`,
  );
} else if (process.argv[2] === "publish") {
  const tag = `v${pkg.version}`;
  const sha = run("git", ["rev-parse", "HEAD"]);
  const tagExists =
    spawnSync("git", ["rev-parse", "--verify", `refs/tags/${tag}`], {
      stdio: "ignore",
    }).status === 0;
  if (tagExists && run("git", ["rev-list", "-n", "1", tag]) !== sha)
    throw new Error(`${tag} already points to another commit`);
  const [pack] = JSON.parse(run("npm", ["pack", "--json", "--ignore-scripts"]));
  // Only a genuine missing-version response permits publishing. Network/auth errors fail closed.
  const lookup = spawnSync(
    "npm",
    [
      "view",
      `${pkg.name}@${pkg.version}`,
      "dist.shasum",
      "--json",
      "--registry=https://registry.npmjs.org/",
    ],
    { encoding: "utf8" },
  );
  if (lookup.status === 0) {
    if (JSON.parse(lookup.stdout) !== pack.shasum)
      throw new Error(
        "Published version differs from this package; bump the version",
      );
    console.log(
      "Identical version already published; finishing GitHub release.",
    );
  } else {
    let error;
    try {
      error = JSON.parse(lookup.stdout).error;
    } catch {}
    if (error?.code !== "E404")
      throw new Error(`npm lookup failed: ${lookup.stderr}`);
    run("npm", [
      "publish",
      pack.filename,
      "--access",
      "public",
      "--provenance",
      "--tag",
      pkg.version.includes("-") ? "next" : "latest",
    ]);
  }
  const release = spawnSync(
    "gh",
    ["api", `repos/${process.env.GITHUB_REPOSITORY}/releases/tags/${tag}`],
    { encoding: "utf8" },
  );
  if (release.status === 0) {
    const existing = JSON.parse(release.stdout);
    if (existing.draft)
      throw new Error("Existing release is a draft; finish it before retrying");
    if (!(existing.assets || []).some((asset) => asset.name === pack.filename))
      run("gh", ["release", "upload", tag, pack.filename]);
    console.log(`Release already exists: ${existing.html_url}`);
  } else {
    if (!release.stderr.includes("HTTP 404"))
      throw new Error(`GitHub release lookup failed: ${release.stderr}`);
    run("gh", [
      "release",
      "create",
      tag,
      "--target",
      sha,
      "--title",
      tag,
      "--generate-notes",
      ...(pkg.version.includes("-") ? ["--prerelease"] : []),
      pack.filename,
    ]);
  }
} else throw new Error("Expected detect or publish");
