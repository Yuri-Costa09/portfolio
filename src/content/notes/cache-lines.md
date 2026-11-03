---
title: Cache lines
summary: The CPU never reads one byte from memory. It moves fixed-size blocks, and that shapes everything above it.
status: evergreen
tags: [hardware, memory]
updated: 2026-10-26
---

Caches move data in fixed-size blocks called **cache lines**. On most x86 and ARM server cores a line is 64 bytes; some chips, such as Apple's M-series, use 128.

When you read one `int64`, the whole line around it comes into L1. Two consequences:

- **Spatial locality is free performance.** Walking an array in order uses every byte of each line you paid for. Jumping around the heap pays for 64 bytes to use 8.
- **Layout is a performance decision.** A struct of arrays can beat an array of structs when a hot loop touches only one field.

The same block granularity is what the coherence protocol (MESI and its variants) tracks between cores. That's the root of [[false-sharing]].

Related: the human-scale view of these costs in the post on [[latency-on-a-human-scale|latency numbers]].
