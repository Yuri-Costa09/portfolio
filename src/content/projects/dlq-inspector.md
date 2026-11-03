---
title: Dead-letter queue inspector
summary: An open-source tool to see, search and replay the messages that end up in dead-letter queues, instead of grepping logs at 2 a.m.
status: active
stack: [Go, PostgreSQL]
order: 1
---

## The problem

Messages that fail processing get parked in a dead-letter queue, and then mostly forgotten. Finding out why they failed, how many share the same cause, and safely sending them back is usually a manual and risky job.

## What it does

- Collects dead-lettered messages with their failure reason and metadata.
- Lets you filter and group them by cause, so one bug shows up as one row, not ten thousand.
- Replays selected messages back to their source, with safeguards against processing the same message twice.

## Decisions so far

TODO: write about the storage model, how replays stay idempotent, and what you would do differently. This page is the place to show how you think, not only what you built.
