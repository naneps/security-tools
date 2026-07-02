# Frontend - React + shadcn/ui

This is the new UI using **shadcn/ui** (Tailwind + beautiful accessible components).

## Setup

```bash
npm install
```

### Initialize shadcn/ui (if not already)

```bash
npx shadcn@latest init
```

Then add useful components:

```bash
npx shadcn@latest add button card input table select textarea
```

## Running

```bash
npm run dev
```

The app connects to the FastAPI backend on port 8001.

## Key pages

- Dashboard (list + monitor)
- Full page Endpoint Editor (no more modal)

Variables like `{{random_string}}`, `{{random_number}}`, and `{{access_token}}` are supported and highlighted.

This setup is much more scalable than the old single HTML file.
