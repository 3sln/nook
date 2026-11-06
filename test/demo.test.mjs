import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

test("demo serves its complete module graph from installed dependencies through stable URLs", () => {
  const code = `
    let server;
    Bun.serve = options => { server = options; };
    await import('./demo/server.js');
    const page = await server.fetch(new Request('http://localhost/'));
    if(page.status !== 200) throw new Error('Missing demo');
    const html = await page.text();
    const imports = JSON.parse(html.match(/<script type="importmap">([\\s\\S]*?)<\\/script>/)[1]).imports;
    if(!Object.entries(imports).filter(([name]) => name.startsWith('@3sln/ngin')).every(([,path]) => path.startsWith('/ngin/src/'))) throw new Error('Dependency URLs must remain compatible with running demo servers');
    const visited = new Set();
    const visit = async path => {
      if(visited.has(path)) return;
      visited.add(path);
      const response = await server.fetch(new Request('http://localhost' + path));
      if(response.status !== 200) throw new Error(path + ': ' + response.status);
      if(!response.headers.get('content-type')?.includes('javascript')) throw new Error('Invalid module MIME type: ' + path);
      const source = await response.text();
      for(const match of source.matchAll(/(?:import|export)\\s+(?:[^'";]+?\\s+from\\s+)?['"]([^'"]+)['"]/g)) {
        const spec = match[1];
        const target = imports[spec] || new URL(spec, 'http://localhost' + path).pathname;
        await visit(target);
      }
    };
    await visit('/nook/src/index.js');
    await visit('/nook/src/capture.js');
    const stress = await server.fetch(new Request('http://localhost/nook/demo/stress.html'));
    if(stress.status !== 200) throw new Error('Missing stress lab');
    await visit('/nook/demo/stress.js');
    const blocked = await server.fetch(new Request('http://localhost/nook/src/%2e%2e%2fpackage.json'));
    if(blocked.status !== 404) throw new Error('Traversal permitted');
    console.log(JSON.stringify({ modules: visited.size }));
  `;
  const result = execFileSync("bun", ["--eval", code], {
    cwd: resolve(import.meta.dirname, ".."),
    encoding: "utf8",
  });
  assert(JSON.parse(result.trim().split("\n").at(-1)).modules >= 12);
});
