# hstack web

The landing page at https://hstack.shellhaki.dev, plus the installer served at `/install`.

- Next.js 16 (App Router), Tailwind CSS 4, deployed to Cloudflare Workers with OpenNext.
- Read [`AGENTS.md`](AGENTS.md) before changing code: this Next.js version differs from older docs.

## Layout

- `src/app/page.tsx`: the landing page.
- `src/app/install/`: `GET /install` returns the shell installer (`script.ts`) as a static file.
- `src/components/`: nav, cost meters, product window, face logo, copy button.
- `src/lib/site.ts`: links and install commands shared across the page.

## Commands

```bash
npm install
npm run dev       # http://localhost:3000
npm run lint
npm run preview   # build with OpenNext and preview on the Workers runtime
npm run deploy    # build and deploy to Cloudflare (needs wrangler login)
```
