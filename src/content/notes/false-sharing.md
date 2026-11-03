---
title: False sharing
summary: Two threads that never touch the same variable can still slow each other down, because they share a cache line.
status: growing
tags: [concurrency, hardware]
updated: 2026-10-27
---

Coherence works per [[cache-lines|cache line]], not per variable. If thread A writes `counterA` and thread B writes `counterB`, and both live in the same 64-byte line, every write by one core invalidates the line in the other core's cache. The line ping-pongs between cores, and two "independent" counters scale worse than one.

Nothing is logically shared, which is why it's called *false* sharing.

## Fix

Put hot, independently-written fields on different lines:

```go
type paddedCounter struct {
	n uint64
	_ [56]byte // 8 + 56 = 64 bytes, one line per counter
}
```

In C++17 there is `std::hardware_destructive_interference_size` with `alignas`. In Go, `golang.org/x/sys/cpu` exports `CacheLinePad`.

## Still open

- How to detect it in a profile without guessing (perf c2c on Linux).
- When padding wastes enough cache to hurt more than it helps.
