---
title: What a context switch costs
summary: The direct cost is saving and restoring registers. The real cost is the warm caches you leave behind.
status: growing
tags: [operating-systems]
updated: 2026-10-24
---

When the kernel switches from one thread to another it saves the CPU state of the outgoing thread (general registers, program counter, stack pointer, flags), picks the next one, and restores its state.

**Switching processes** costs more than switching threads of the same process, because the address space changes too. The page-table root is replaced, and without tagged TLB entries (PCID on x86) the TLB has to be flushed.

**The indirect cost usually dominates.** The new thread starts with caches and TLB full of someone else's data, so its first stretch of work runs mostly out of the slow tiers. How much this hurts depends on the working set, which is why published "a switch costs N microseconds" numbers vary so much.

This is part of why runtimes like Go multiplex many goroutines onto few OS threads: switching goroutines stays in user space and avoids the kernel round trip. Caches still go cold, though, see [[cache-lines]].

## To write next

- Voluntary vs involuntary switches, and how to see them (`/proc/<pid>/status`, `perf sched`).
- How the Go scheduler decides when to hand off a thread.
