# Frontend plan

The application is a Vite + React single-page frontend. Navigation is state-based to keep the prototype deployable without routing or API configuration.

`src/App.jsx` contains the UI screens and a deterministic demonstration analyser. `src/styles.css` provides the responsive visual system, motion, and reduced-motion support. The analyser models the PRD checks C1–C7, including the recommended cap when an upfront payment signal is present.

When the FastAPI service is available, replace `runScan` with a request to `POST /api/v1/scans`, preserve the returned `checks` array as-is, and replace localStorage history with the protected scan endpoints.
