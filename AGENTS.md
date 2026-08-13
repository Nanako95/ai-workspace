# Workspace Agent Guide

Before modifying a project, read this file and the target project's own `AGENTS.md` and `README.md`.

## Classification

- Runnable products belong in `platform/<project-name>`.
- Reusable agent capabilities belong in `skills/<skill-name>`.
- Scripts and scheduled workflows belong in `automations/<automation-name>`.
- Early prototypes belong in `experiments/<experiment-name>`.
- Retired projects belong in `archive/<project-name>`.

## Rules

- Keep each project self-contained.
- Do not commit secrets, credentials, personal data, customer data, or generated dependency folders.
- Run the target project's documented validation before committing.
- Deployment workflows shared by the monorepo belong in the root `.github/workflows` directory.
