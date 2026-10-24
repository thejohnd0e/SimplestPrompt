# Bug Report Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect required diagnostic information in new bug reports.

**Architecture:** Add a native GitHub YAML Issue Form; leave extension code and repository issue policy unchanged.

**Tech Stack:** GitHub Issue Forms YAML.

**Spec:** `docs/superpowers/specs/2026-10-24-issue-form-design.md`

## Global Constraints
- English wording; no installation-source question.
- Required environment, behavior, reproduction, and regression fields as specified.
- Screenshots, errors, and additional context remain optional.
- Do not publish changes or change existing issues.

## Review Focus
- Unknown regression history must be an acceptable answer.
- Browser and OS questions must explicitly request versions.
- Users without screenshots or logs must be able to submit.
- The privacy warning must cover tokens, passwords, and private prompts.
- No installation-source question or store assumption may appear.

### Task 1: Add and validate the bug report form

**Files:** Create `.github/ISSUE_TEMPLATE/bug_report.yml`.

**Interfaces:** GitHub reads the YAML and renders required inputs and optional textareas.

- [x] Add the form with the specified required fields, optional attachments/logs/context, and privacy warning.
- [x] Parse the YAML using an available YAML parser; check unique IDs, supported field types, required flags, and all Review Focus items.
- [x] Run `git diff --check` and inspect the changes to confirm only the intended files changed.
- [x] Report local verification separately from GitHub rendering, which requires the file on the default branch. Do not commit or push without authorization.

## Verification record
PyYAML parsed the form successfully. Assertions passed for eight required and three optional fields, unique IDs, supported types, browser/OS version wording, unknown regression history, privacy warnings, and absence of installation/store questions. GitHub rendering remains unverified until publication on the default branch. No commit or push performed.
