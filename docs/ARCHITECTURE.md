# Architecture

Vydrivo is a Next.js studio for short vertical explainers. A signed-in creator
moves through four steps: Idea, Storyboard, Video and Publish.

```text
Landing  ->  Auth  ->  Studio
                         |
                         +-- Idea
                         +-- Storyboard
                         +-- Video
                         +-- Projects / Videos
```

## What this repository includes

- The public landing page and studio screens.
- Auth, session and project API routes.
- Storyboard editing in the browser.
- Database migrations for owner-scoped projects.
- Portfolio screenshots from the working product.

## What stays private

Generation, narration, diagram rendering, media probing and durable video
storage are product services. Their implementation is not in this repository.
The public routes for those steps return an explicit unavailable response so
the app structure remains honest.

## Local run

```bash
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. The live product is separate from this portfolio copy.
