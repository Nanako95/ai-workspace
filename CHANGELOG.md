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

## 2026-08-13 - Add automatic GitHub publishing workflow and update documentation
- Target: .
- Changed paths:
- skills/README.md
- \344\275\277\347\224\250\344\270\216\346\233\264\346\226\260\346\214\207\345\215\227.md
- CHANGELOG.md
- skills/github-auto-update/
- Validation: git diff --check plus the project-specific checks reported by the AI.

