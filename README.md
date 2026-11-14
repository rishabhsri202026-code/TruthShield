# TruthShield

A responsive digital-safety dashboard prototype for reviewing suspicious news claims, messages, and URLs. This starter uses transparent, browser-local heuristics; it does not claim that content is fact-checked, that URLs are checked against threat-intelligence feeds, or that an LLM has analyzed your input.

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To create and preview a production build:

```bash
npm run build
npm run preview
```

## Features

- Three local detectors: news language signals, scam/social-engineering patterns, and URL structure checks.
- Explainable risk scores, warning signs, and safety recommendations.
- Recent scan history and counts stored in browser local storage.
- URL inspection parses the supplied string only; the app does not fetch or open suspicious links.
- Responsive React + TypeScript UI with Tailwind CSS.

## Detection scope and safety

Scores are heuristic indicators, not calibrated probabilities, verdicts, or evidence that a claim is true or false. A low score does not establish safety. The initial version does not make network requests to an LLM, fact-check API, or threat-intelligence API. Do not enter sensitive personal data. History remains in browser storage until cleared by the user or browser. For production, integrate external providers through a backend so secrets are never exposed in frontend code, add rate limiting and privacy controls, and independently validate detector behavior.

## Deployment

Any static hosting platform that supports Vite can deploy the generated `dist/` directory. Run `npm run build` in the deployment build step. No API keys are required for the local heuristic version.
