import { resolve, sep } from "node:path";
const root = resolve(import.meta.dir, "..");
const routes = [
  ["/nook/demo/", resolve(root, "demo")],
  ["/nook/src/", resolve(root, "src")],
  [
    "/nook/node_modules/@3sln/ngin/src/",
    resolve(root, "node_modules/@3sln/ngin/src"),
  ],
];
const port = Number(process.env.PORT || 4178);
Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    if (pathname === "/") pathname = "/nook/demo/index.html";
    const route = routes.find(([prefix]) => pathname.startsWith(prefix));
    if (!route) return new Response("Not found", { status: 404 });
    const [prefix, directory] = route;
    const path = resolve(directory, pathname.slice(prefix.length));
    if (!path.startsWith(directory + sep))
      return new Response("Not found", { status: 404 });
    const file = Bun.file(path);
    return (await file.exists())
      ? new Response(file, { headers: { "Cache-Control": "no-cache" } })
      : new Response("Not found", { status: 404 });
  },
});
console.log(`Nook demo: http://localhost:${port}`);
