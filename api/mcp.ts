let appPromise: any = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    appPromise = import("../packages/mcp/src/index.js").then((mod) => mod.app);
  }
  const app = await appPromise;
  return app(req, res);
}
