# Change Log

本文件记录已发布到本仓库的主要更新。每次平台、skill 或说明文档更新并推送后，新增一条日期记录。

## 2026-08-13 - Add GitHub auto-update skill

- Target: `skills/github-auto-update`
- Added a reusable workflow for local validation, secret/generated-file checks, dated changelog entries, normal-commit publishing, and remote commit verification.
- Updated `skills/README.md` and `使用与更新指南.md` with discovery and new-computer installation instructions.
- Validation: skill structure checked with `quick_validate.py`; publish script dry-run and repository build checks are recorded with this release.

## 2026-08-13 - Improve pivot field layout and multi-select analysis

- Target: `platform/dataflow-studio`
- Added clearer multi-select field controls and an Excel-like analysis configuration layout.
- Validation: production build completed before publishing.

## 2026-08-13 - Expand analytics filters and sample data

- Target: `platform/dataflow-studio`
- Added analytics filtering, richer time-based sample data, and updated related product documentation.
- Validation: production build completed before publishing.

## 2026-08-13 - Normalize the initial changelog entry
- Target: CHANGELOG.md
- Changed paths:
- CHANGELOG.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-13 - Add reusable workspace application scenarios template
- Target: documents\templates\workspace-application-scenarios.md
- Changed paths:
- documents/templates/workspace-application-scenarios.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-13 - Remove personal data from sample CSV and anonymize demo records
- Target: platform\dataflow-studio
- Changed paths:
- platform/dataflow-studio/src/main.jsx
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-13 - Improve quality scoring with exact duplicate and field format checks
- Target: platform\dataflow-studio
- Changed paths:
- platform/dataflow-studio/src/main.jsx
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-13 - Expand explainable data quality scoring rules
- Target: platform\dataflow-studio
- Changed paths:
- platform/dataflow-studio/src/main.jsx
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Add mobile cloud ledger with OCR, currency conversion, and deployment files
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Switch ledger cloud storage to Supabase and add setup schema
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/README.md
- platform/little-ledger/server.mjs
- platform/little-ledger/supabase-schema.sql
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Document the live Render URL
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/CHANGELOG.md
- platform/little-ledger/README.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Sync platform documentation and publish the live little ledger URL
- Target: .
- Changed paths:
- README.md
- platform/README.md
- \344\275\277\347\224\250\344\270\216\346\233\264\346\226\260\346\214\207\345\215\227.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Allow ledger saves when exchange rates are temporarily unavailable
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/CHANGELOG.md
- platform/little-ledger/app.js
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Fix duplicate cloud login and synchronize ledger deletes
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/app.js
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Add Supabase health check and Render request error logging
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/server.mjs
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Expose safe Supabase health error detail
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/server.mjs
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Support Supabase secret keys without JWT authorization
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/server.mjs
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Grant Supabase service role access to ledger tables
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/supabase-schema.sql
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Add cross-platform PWA share import for mobile receipts
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/Dockerfile
- platform/little-ledger/README.md
- platform/little-ledger/app.js
- platform/little-ledger/index.html
- platform/little-ledger/server.mjs
- platform/little-ledger/icon.svg
- platform/little-ledger/manifest.webmanifest
- platform/little-ledger/service-worker.js
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Document Android and iPhone share import usage
- Target: platform
- Changed paths:
- platform/README.md
- platform/little-ledger/README.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Clean up stale temporary share imports
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/service-worker.js
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-24 - Keep login sessions for 24 hours
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/README.md
- platform/little-ledger/app.js
- platform/little-ledger/server.mjs
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Add batch receipt uploads and continuous camera capture
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/README.md
- platform/little-ledger/app.js
- platform/little-ledger/camera.css
- platform/little-ledger/index.html
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Make categories account-scoped and document GitHub Render Supabase setup and cleanup
- Target: platform
- Changed paths:
- platform/README.md
- platform/little-ledger/README.md
- platform/little-ledger/app.js
- platform/little-ledger/index.html
- platform/little-ledger/server.mjs
- platform/little-ledger/styles.css
- platform/little-ledger/supabase-schema.sql
- platform/little-ledger/DEPLOYMENT-GUIDE.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Improve multilingual receipt OCR, editable drafts, currency detection, and screenshot cropping
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/DEPLOYMENT-GUIDE.md
- platform/little-ledger/README.md
- platform/little-ledger/app.js
- platform/little-ledger/index.html
- platform/little-ledger/ocr.css
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Document Supabase storage inspection and cleanup procedures
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/DEPLOYMENT-GUIDE.md
- platform/little-ledger/README.md
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Add the Project Pilot local project management app with sanitized demo data
- Target: platform\project-pilot
- Changed paths:
- platform/project-pilot/
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Add resizable crop controls for receipt screenshots
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/DEPLOYMENT-GUIDE.md
- platform/little-ledger/README.md
- platform/little-ledger/app.js
- platform/little-ledger/index.html
- platform/little-ledger/ocr.css
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Only retain original receipt text when translation changes
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/app.js
- Validation: git diff --check plus the project-specific checks reported by the AI.

## 2026-08-25 - Clean legacy receipt labels in existing transaction display
- Target: platform\little-ledger
- Changed paths:
- platform/little-ledger/app.js
- Validation: git diff --check plus the project-specific checks reported by the AI.

