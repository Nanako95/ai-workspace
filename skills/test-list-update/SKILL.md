---
name: test-list-update
description: Update and audit WABA test-list workbooks from a DataWorks full-list CSV and a test-list CSV. Use when the user mentions 测试名单更新, WABA 测试名单, DataWorks 全量名单, updating Excel 人数表 by bucket/workplace, comparing DataWorks vs 测试名单, or adding missing people to the test-list CSV.
---

# 测试名单更新

## Required Inputs

Always ask the user for fresh file paths before starting a task. Do not reuse paths from a previous run unless the user explicitly confirms them.

Required paths:

- Target Excel workbook, usually containing a `2026名单` sheet.
- DataWorks full-list CSV.
- Test-list CSV.

Also confirm:

- Target sheet name if it is not obvious.
- Target month or table area, such as `7月`.
- Whether to update Excel only, compare differences only, append missing test-list rows, or do all requested steps.
- Whether temporary backups should be deleted after verification.
- Whether to send a Feishu report after completion. If sending Feishu IM, follow `lark-im` safety rules and confirm recipient/content/identity before sending.

## Workflow

1. Inspect the files before writing.
   - Confirm the files exist and identify the latest intended test-list CSV if the user gives only a directory.
   - Read CSV headers. Expected test-list columns: `owner_id,bucket,group_name,workplace,spv,username,scrm_1,scrm_2`.
   - Read the workbook sheet names and locate the target month tables.

2. Aggregate people by `workplace + bucket`.
   - For Excel 人数表 columns, normalize buckets as:
     - `S1-2*` -> `S1-2`
     - `S2*` -> `S2`
     - `S3*` -> `S3`
     - `S1-1Big` and `S1-1Small` stay exact.
   - Ignore buckets not represented by the table columns, but report them.

3. Update the Excel workbook when requested.
   - Create a temporary backup before writing.
   - Write the test-list aggregation into the WABA usage table.
   - Write the DataWorks aggregation into the total-people table.
   - Refresh row and column total formulas for the target month table.
   - Reopen and verify the written cells match computed counts.
   - Delete the backup only after verification and only when the user allowed it.

4. Compare DataWorks and test-list records when requested.
   - Compare usernames case-insensitively: DataWorks `owner_username` vs test-list `username`.
   - For "same group_name" comparisons, group by `group_name`; for stricter comparisons, group by `group_name + bucket`.
   - When the user says DataWorks should only look at FBL3, filter only the DataWorks side with `workplace=FBL3`.
   - Distinguish person-level differences from entire missing `group_name` or `group_name + bucket` combinations.

5. Append missing people to the test-list CSV when requested.
   - Append by `username`, matching the requested usernames against DataWorks `owner_username` case-insensitively.
   - If a username already exists in test-list `username`, skip it instead of duplicating it.
   - If DataWorks has multiple rows for the same username after filters, stop and ask for a narrower filter such as workplace, bucket, or group_name.
   - Source fields from DataWorks:
     - `owner_id` -> `owner_id`
     - `bucket` -> `bucket`
     - `group_name` -> `group_name`
     - `workplace` -> `workplace`
     - `spv` -> `spv`
     - `owner_username` -> `username`
   - Leave `scrm_1` blank unless the user says otherwise.
   - Set `scrm_2=waba` when requested.
   - After appending, recompute the Excel test-list table if that workbook should stay in sync.

## Script

Use `scripts/test_list_update.py` for repeatable work.

Examples:

```powershell
python .codex\skills\test-list-update\scripts\test_list_update.py aggregate --csv "test.csv"
python .codex\skills\test-list-update\scripts\test_list_update.py update-excel --xlsx "workbook.xlsx" --full-csv "dataworks.csv" --test-csv "test.csv" --sheet "2026名单" --month 7 --delete-backup
python .codex\skills\test-list-update\scripts\test_list_update.py diff --full-csv "dataworks.csv" --test-csv "test.csv" --full-workplace FBL3 --same group
python .codex\skills\test-list-update\scripts\test_list_update.py append --full-csv "dataworks.csv" --test-csv "test.csv" --usernames mochamad05,forman,syafira02 --full-workplace FBL3 --scrm2 waba
```

If `openpyxl` is missing and Excel writing is required, install it with `pip install --user openpyxl` after confirming this is acceptable.

## Reporting

Report:

- Files used.
- Target sheet/month/table area.
- Counts written by workplace and bucket.
- Rows ignored because bucket/workplace did not map to the table.
- Differences found or rows appended.
- Backup status and verification result.
- Feishu message status if a report was sent.
