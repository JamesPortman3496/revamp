# Copilot / AI agent instructions — revamp

Purpose: give an AI coding agent the minimal, practical knowledge to be productive in this repo.

- **Big picture**: This repository contains two separate apps:
  - `backend/` — a Flask application (legacy UI) that loads data from an MSSQL database, massages it into pandas DataFrames and serves server-rendered pages from `backend/templates/` and static JS/CSS in `backend/static/`. Data is refreshed periodically by `DataManager` and an APScheduler background job.
  - `frontend/` — a Next.js (React + TypeScript) app scaffolded under `frontend/`. It includes UI components, but many pages are scaffolded/empty; the Next app is independent from the Flask app and has its own `npm` scripts (`dev`, `build`, `start`).

- **Run / dev commands**:
  - Backend (recommended):
    - Create venv, install and run:
      - `python3 -m venv .venv && source .venv/bin/activate`
      - `pip install -r backend/requirements.txt`
      - `python backend/app.py` (app listens on 0.0.0.0:5000 by default)
    - Notes: `DataManager` connects to SQL via `pymssql` using `backend/config.py`. If you don't have the DB, stub or mock `DataManager.get_sql_info()` to return small sample DataFrames for fast local dev.
  - Frontend:
    - `cd frontend && npm install`
    - `npm run dev` (Next dev server on http://localhost:3000)

- **Key integration points / HTTP routes (Flask)** — useful to exercise API or write tests:
  - `GET /` — landing page
  - `GET /index` — detect changes page
  - `GET /doc_select?doc_typ=<legislation|...>` — returns JSON list of docs
  - `GET /sec_select?doc_typ=&docs=&recency=` — returns section options
  - `GET /recency_select` and `GET /relevance_select` — dropdown options
  - `GET /doc_change?doc_typ=&docs=&recency=&sec=&rel_type=` — main data for detect changes table (returns detail_df and PDF URLs)
  - `POST /save_changes` — accepts form field `results` (JSON string of [{id,value},...]) and updates SQL
  - `GET /plot_treemap` and `GET /plot_sankey` — return JSON for plotly visualisations

  Example curl to fetch change table:
  ```bash
  curl "http://localhost:5000/doc_change?doc_typ=legislation&docs=MyDoc&recency=1%20year&sec=All&rel_type=relevant"
  ```

- **High-impact, repo-specific patterns & gotchas (do not change lightly)**
  - Column ordering requirement: `utils.get_doc_changes()` constructs `detail_df` and the codebase (see `backend/static/js/change_functions.js`) expects `ID` and `status` to be the last two columns. The `utils.py` file contains a warning comment — preserve this ordering when modifying `detail_df` or templates.
  - Columns with prefix `SL` are treated specially. Any column that starts with `SL` is processed by `utils.get_long_tbl_sl_links_df()` and related functions; renaming or changing that prefix will break the SL-links pipeline.
  - Status values and logic: status values used across the app are lowercase strings like `not started`, `reviewed`, `addressed`, `not relevant`. `utils.update_status_on_submit()` and SQL update logic expect these exact values.
  - Date formatting: `constant.DT_FORMAT` and `constant.START_DT_FOR_BACKLOG_STATS` drive date parsing and filtering; changes to date formats must be coordinated across utils and templates.
  - Background updates: `backend/app.py` instantiates `DataManager()` and schedules `dm.update()` hourly via APScheduler. Local runs will immediately attempt to load SQL; to avoid DB calls, mock `DataManager.update` in local dev or set a flag.
  - Azure Blob / PDF URLs: `utils.get_pdf_url_with_blob_sas_token()` builds temporary SAS URLs using credentials from `backend/config.py` (BLOB_CONNECTION). Ensure container paths and keys are valid or stub this when offline.

- **Credentials & secrets**:
  - `backend/config.py` currently contains hard-coded SQL and Blob credentials. Treat these as sensitive — do not commit additional secrets or change patterns without switching to environment-based config. Preferred improvement: read sensitive values from environment variables and keep `config.py` out of VCS.

- **Where to look first to implement/change features** (quick entry points)
  - Data & business logic: `backend/utils.py` and `backend/data_manager.py`
  - Routes & wiring: `backend/app.py`
  - Templates and client JS interactions: `backend/templates/` and `backend/static/js/change_functions.js` (DOM + AJAX), `viz_functions.js` (plotly interactions)
  - Constants and config: `backend/constant.py`, `backend/config.py`
  - Next.js scaffold: `frontend/` (components under `frontend/src/components/`), run with `npm run dev`

- **Tests & CI**: No tests or GitHub workflows detected. If you add tests, a small smoke test should:
  - Start backend with mocked DB or sample CSV data, hit `/doc_change` and assert JSON fields exist.

- **When adding or modifying API behavior**:
  - Update both server-side `utils` and the client-side JS which consumes the route (either `change_functions.js` or the Next frontend component). Check that the returned `detail_df` ordering and column shape match the consumer's expectations.

If anything above is unclear or you'd like this doc expanded (examples for mocking the SQL, a local sample dataset, or a suggested env-var migration for `config.py`), tell me which part to expand and I will update the file.
