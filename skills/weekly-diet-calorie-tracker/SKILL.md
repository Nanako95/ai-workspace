---
name: weekly-diet-calorie-tracker
description: 记录和核算每日饮食热量，维护按 ISO 周组织的饮食账本，支持文字/图片估算、历史查询、周趋势、TDEE、个人常用食物库和纠错。用户说记录饮食、算今天热量、更新本周、查看历史周、估算食物图片或修改饮食记录时使用。
---

# Weekly Diet Calorie Tracker

## Overview

Use this skill to keep a conservative, auditable diet calorie log. Record only user-provided food; give a central estimate plus a reasonable range; maintain daily and weekly totals without inventing missing data.

## Core Rules

- Use the user's current language; default to Chinese.
- Organize records as `Week YYYY-Www` (Monday-Sunday). Never overwrite completed weeks or copy old meals into a new week.
- Prefer evidence in this order: package nutrition label or measured weight, the user's food library, image/container estimation, then generic reference values.
- For every estimate provide `center kcal`, `reasonable range`, evidence source, confidence, and the main uncertainty. Do not claim false precision.
- Ask at most one key follow-up when missing information could change the total by about 25% or more; otherwise provide a range and proceed.
- Treat corrections as edits to the original record. Recalculate that food, the day, and the owning week; show `old -> new` and the reason.

## Daily Workflow

1. Identify food, portion, weight, raw/cooked state, bone/skin, cooking method, whether it was finished, oil/sauce/soup intake, packaging data, and photo clues.
2. For photos inspect container size, food share, visible references, piece count/thickness, edible meat ratio, rice/noodles, sauce and remaining food. Estimate edible weight before applying calorie density.
3. Output a daily table:

```markdown
## YYYY-MM-DD 饮食核算
| 食物 | 估算热量 |
|---|---:|
| 食物 A | xxx kcal |
| **当日合计** | **xxxx kcal** |
- 合理范围：xxxx-xxxx kcal
- TDEE：xxxx kcal (if established)
- 今日缺口/盈余：...
```

4. Update the current week's daily row, cumulative intake, recorded days, average intake, and relative TDEE. If TDEE is absent, state `尚未建立 TDEE` and do not calculate a deficit.

Use `cumulative maintenance = recorded days * TDEE`, `cumulative difference = intake - maintenance`, and theoretical fat change `kg = cumulative difference / 7700`. Explicitly distinguish theoretical fat change from scale weight; water, salt, glycogen, and digestion cause short-term changes.

## Weekly and Historical Queries

- “上周” means the ISO week before the current week; “这周” means the current week; “前两周” means the two latest established history weeks; a value such as `2026-W29` is an exact week.
- Return existing records even when a week is incomplete, and list missing dates instead of filling them.
- Sunday after all days are confirmed: show daily intake, weekly total, average, recorded days, cumulative deficit/surplus, theoretical fat change, highest/lowest day, and completeness.
- With at least two consecutive weeks, compare weekly averages and cumulative difference; with four or more weeks, add 2-week/4-week moving averages and trend commentary.

## Food Library and Corrections

Create or update a personal food entry only when the user explicitly asks to remember it, the same food appears at least twice under similar conditions, or a clear label/weight exists. Store standard name, aliases, standard portion, center/range, raw/cooked and bone/skin conditions, source, confidence, update time, and usage count.

New reliable evidence replaces the old center value with a revision note. A different portion adds a conversion; a different cooking method or cut becomes a separate entry. Keep multiple versions or lower confidence when estimates differ by over 25%.

When the user says “不是半盒，是 40%”, replace the old portion. “又吃了 20%” is an additional intake. A date correction moves the item to the correct date and recalculates both dates and weeks.

## TDEE and Safety

Do not adjust TDEE from a single week's scale fluctuation. Suggest recalibration only after 2-4 weeks of reasonably complete data and a stable weight trend. A rough reverse estimate is `actual TDEE ≈ average intake + average daily weight loss kg * 7700`; mention interference from water, menstrual cycle, salt, travel, training, and digestion.

This is a tracking/estimation tool, not medical advice. Do not encourage extreme restriction or punitive compensation. For minors, pregnancy, breastfeeding, low BMI, eating-disorder history, chronic disease, or dizziness, weakness, palpitations, fainting, or binge urges, avoid aggressive targets and recommend a clinician or registered dietitian.

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Example: DOCX skill with "Workflow Decision Tree" -> "Reading" -> "Creating" -> "Editing"
- Structure: ## Overview -> ## Workflow Decision Tree -> ## Step 1 -> ## Step 2...

**2. Task-Based** (best for tool collections)
- Works well when the skill offers different operations/capabilities
- Example: PDF skill with "Quick Start" -> "Merge PDFs" -> "Split PDFs" -> "Extract Text"
- Structure: ## Overview -> ## Quick Start -> ## Task Category 1 -> ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Example: Brand styling with "Brand Guidelines" -> "Colors" -> "Typography" -> "Features"
- Structure: ## Overview -> ## Guidelines -> ## Specifications -> ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Works well when the skill provides multiple interrelated features
- Example: Product Management with "Core Capabilities" -> numbered capability list
- Structure: ## Overview -> ## Core Capabilities -> ### 1. Feature -> ### 2. Feature...

Patterns can be mixed and matched as needed. Most skills combine patterns (e.g., start with task-based, add workflow for complex operations).

Delete this entire "Structuring This Skill" section when done - it's just guidance.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here. See examples in existing skills:
- Code samples for technical skills
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources (optional)

Create only the resource directories this skill actually needs. Delete this section if no resources are required.

### scripts/
Executable code (Python/Bash/etc.) that can be run directly to perform specific operations.

**Examples from other skills:**
- PDF skill: `fill_fillable_fields.py`, `extract_form_field_info.py` - utilities for PDF manipulation
- DOCX skill: `document.py`, `utilities.py` - Python modules for document processing

**Appropriate for:** Python scripts, shell scripts, or any executable code that performs automation, data processing, or specific operations.

**Note:** Scripts may be executed without loading into context, but can still be read by Codex for patching or environment adjustments.

### references/
Documentation and reference material intended to be loaded into context to inform Codex's process and thinking.

**Examples from other skills:**
- Product management: `communication.md`, `context_building.md` - detailed workflow guides
- BigQuery: API reference documentation and query examples
- Finance: Schema documentation, company policies

**Appropriate for:** In-depth documentation, API references, database schemas, comprehensive guides, or any detailed information that Codex should reference while working.

### assets/
Files not intended to be loaded into context, but rather used within the output Codex produces.

**Examples from other skills:**
- Brand styling: PowerPoint template files (.pptx), logo files
- Frontend builder: HTML/React boilerplate project directories
- Typography: Font files (.ttf, .woff2)

**Appropriate for:** Templates, boilerplate code, document templates, images, icons, fonts, or any files meant to be copied or used in the final output.

---

**Not every skill requires all three types of resources.**
