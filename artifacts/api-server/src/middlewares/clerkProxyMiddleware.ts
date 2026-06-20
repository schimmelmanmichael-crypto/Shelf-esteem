import type { Request, Response } from 'express';

export function clerkProxyMiddleware() {
  return async (req: Request, res: Response): Promise<void> => {
    const clerkUrl = `https://known-mustang-67.clerk.accounts.dev${req.path}`;
    try {
      const proxyRes = await fetch(clerkUrl, {
        method: req.method,
        headers: {
          ...Object.fromEntries(
            Object.entries(req.headers).filter(([k]) => k !== 'host') as [string, string][]
          ),
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
      });

      res.status(proxyRes.status);
      proxyRes.headers.forEach((value, key) => res.setHeader(key, value));
      const text = await proxyRes.text();
      res.send(text);
    } catch {
      res.status(502).json({ error: 'Clerk proxy error' });
    }
  };
}
