---
title: MVCC
summary: Readers don't block writers because each transaction reads its own snapshot of versions.
status: seedling
tags: [databases]
updated: 2026-10-30
---

Multi-version concurrency control keeps several versions of a row. A write creates a new version instead of overwriting; a reader sees the versions that were committed when its snapshot was taken.

Two common ways to store the old versions:

- **PostgreSQL** keeps every version in the table itself, marked with the transactions that created and deleted it. Dead versions are cleaned up later by `VACUUM`.
- **InnoDB (MySQL)** updates the row in place and keeps the previous versions in an undo log, rebuilding old versions on demand.

## Questions I haven't answered yet

- Exactly which anomalies snapshot isolation still allows (write skew).
- How serializable snapshot isolation detects the dangerous cases.
