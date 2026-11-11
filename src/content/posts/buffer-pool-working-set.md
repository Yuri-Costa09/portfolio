---
title: 'Buffer Pool and Working Set: Why Your Database Gets Slow (and When Sharding Actually Helps)'
description: 'What the buffer pool and the working set are, how they relate, and why the working set, not the data size, decides when sharding helps.'
date: 2026-11-11
tags: [databases, system design, backend, performance]
---

A query that used to run in 5 ms now takes 200 ms. Nobody touched the code, the index is still there, and the execution plan is the same. What changed is *where* the database is reading from: RAM or disk.

Two concepts explain most of this: the **buffer pool** and the **working set**. Understanding both, and how they relate, also helps you answer a classic system design interview question: *"when do I need sharding?"*

## Buffer Pool: The Database's Cache

The buffer pool is a region of **RAM allocated by the database** to hold **data pages and indexes**. The goal is simple: avoid going to disk, which is orders of magnitude slower than memory, even with SSDs.

Two things matter here:

- The database reads and writes in **pages**, fixed-size blocks (8 KB in Postgres, for example), not individual rows.
- The buffer pool has a **fixed size**, set at startup. It doesn't grow with demand.

### How it works

1. A query needs a page.
2. The database checks whether it's already in the buffer pool.
   - **Cache hit:** it reads straight from memory.
   - **Cache miss:** it reads from disk, loads the page into the buffer pool, and only then responds.
3. If the buffer pool is full, an old page gets **evicted**. The policy is usually an LRU variant: InnoDB uses a split LRU with "young" and "old" regions, and Postgres uses *clock-sweep*.

### Writes and dirty pages

On an `UPDATE` or `INSERT`, the change happens first on the in-memory page, which gets marked as **dirty**. A background process (checkpoint/flush) writes those pages to disk later, in batches.

This is safe because the **WAL / redo log** has already recorded the change sequentially. If the node crashes before the flush, the database recovers from the log.

### The metric that matters: hit ratio

```
hit ratio = hits / (hits + misses)
```

In a healthy system, this sits around 99% or higher. When it drops, the database is going to disk often.

## Working Set: What You Actually Use

This is an important distinction, and most people don't even know the concept exists. The **working set** is a broader concept from computer science. In operating systems, it's the amount of memory a process needs to have loaded over a time window to finish an operation.

In databases, the working set is the amount of data the database needs to touch to serve operations over a time window (24 h, 1 h, 15 min...).

It is not the same as total database size. A 1 TB database can have a 50 GB working set, because most accesses land on a small fraction of the data: recent orders, active users, the most queried indexes.

| | Buffer pool | Working set |
|---|---|---|
| What it is | Memory reserved for caching | Data the application actually accesses |
| Size | Fixed (configuration) | Dynamic (depends on query patterns) |
| Who defines it | Whoever configures the database | Production traffic |

## How the Two Relate

**Working set smaller than the buffer pool.** Almost everything the application asks for is already in memory. High hit ratio, low latency. The system is healthy.

**Working set larger than the buffer pool.** The database needs more pages than the cache can hold. Pages keep getting evicted and re-read from disk, misses climb, and latency spikes. This behavior has a name: **thrashing**.

A common way to make things worse is the **full table scan**. It reads lots of pages that almost nobody uses and can evict the hot pages from the cache, dragging down the hit ratio of the whole system because of a single query.

That's why, before adding a new index to fix a slow query, it's worth checking the hit ratio. The problem may just be a buffer pool that's too small for the working set.

## Each Engine Has Its Own Name

| Engine | Main cache | Configuration |
|---|---|---|
| MySQL / InnoDB | Buffer pool | `innodb_buffer_pool_size` |
| PostgreSQL | `shared_buffers` (plus a lot of OS page cache on top) | `shared_buffers` |
| MongoDB (WiredTiger) | WiredTiger cache | `wiredTigerCacheSizeGB` (default: 50% of (RAM − 1 GB)) |
| Cassandra | Key cache (JVM heap) and row cache (off-heap) + OS page cache | varies per table and config |
| Elasticsearch / Lucene | No classic buffer pool: relies on the OS page cache | leave free RAM for the OS |

The concept is the same everywhere: keep the hot data in memory. What changes is who manages the cache, the database or the operating system.

## The Interview Angle: Sharding Isn't About Size

In a system design interview, the reflex answer to "the database is too big" is "shard it." The working set and the buffer pool show why that answer is incomplete.

**Total data size doesn't decide. The working set does.** If the database holds 1 TB, but the access pattern keeps the working set at 50 GB, and the node has 64 GB of buffer pool, that node serves traffic just fine. High hit ratio, low latency. Sharding in that situation adds complexity (routing, cross-shard queries, rebalancing) without solving any real problem.

**Sharding starts to help when the working set no longer fits in one node's buffer pool.** By splitting the data, you also split the working set: each shard has its own, and each node has its own buffer pool. Total cache memory grows with the number of nodes.

This only works if **access is also distributed across the shard key**. If one shard concentrates the traffic (a *hot shard*, or *data skew*), its working set is still huge and the gain disappears.

The working set isn't the only reason to shard. These also count:

- **Write throughput** that a single node can't handle.
- **Storage limits** of the node or instance.
- **Fault isolation**, to limit the blast radius when a node goes down.

### A sample answer

> "The database is slow. First I check the hit ratio and estimate the working set of real traffic. If it fits in the buffer pool, the problem is elsewhere: queries, indexes, locks. If it doesn't, I try giving the node more memory, because that's usually cheaper than sharding. If the working set grows beyond what a single node can hold, or if the bottleneck is writes or storage, I shard on a key that distributes access, not just data."

## Quick Checklist

- Measure the **working set of production traffic**, not the dataset size.
- Size the buffer pool to hold it **with headroom**, leaving RAM for the OS and connections.
- Track the **hit ratio** and be suspicious of drops after deploys or new queries.
- Watch out for **full scans** on large tables.
- Before sharding, confirm the bottleneck is really the working set, writes, or storage.

## For Future Posts

- How InnoDB decides when to promote a page from "old" to "young" in the split LRU, so a full scan doesn't pollute the cache.
- When to increase `shared_buffers` in Postgres and when to rely on the OS page cache.
- Cold cache: what happens to the hit ratio after a restart, and how to "warm up" the buffer pool.
