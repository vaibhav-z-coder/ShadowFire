# TrustHire frontend specification

## Implemented scope

- **FR-1, FR-3:** Offer text input and optional structured inputs.
- **FR-2:** Image upload/drop-zone interface; OCR is intentionally represented as a frontend demo input, not a service.
- **FR-5:** Extracted offer details can be edited and re-checked.
- **FR-7–FR-9:** A local deterministic assessment renders a 0–100 score, risk band, and individual checks.
- **FR-12–FR-13:** Results include animated gauge, red flags, positive signals, detail card, evidence, and next steps.
- **FR-18–FR-19:** Browser-local history supports search, band filters, detail view for saved scans, and deletion.
- **FR-20–FR-23:** Responsive landing page, loading pipeline, CSS motion, and dark-friendly contrast.

## Deliberate frontend-only boundaries

The prototype does not connect to a database, auth provider, OCR service, API, or file storage. Its upload and auth views clearly remain UI placeholders. Uploaded files are not read or persisted.

## Acceptance checks

1. A user can use the sample offer and reach a High Risk assessment.
2. A user can enter a company-domain email and matching website and receive positive signals.
3. Opening a red flag shows its evidence.
4. Editing the result details and choosing Re-check recomputes the local assessment.
5. Saving a scan makes it appear in History, where the user can search, filter, open, or delete it.
