---
title: Latency numbers on a human scale
description: If reading from L1 cache took one second, a trip to main memory would take three minutes and a disk seek most of a year.
date: 2026-10-28
tags: [performance, hardware]
---

Everyone has seen the table of latency numbers every programmer should know. Most of us have also stared at it without feeling anything. Nanoseconds and milliseconds are both "fast", so the gap between them doesn't register.

A trick that fixes this: pick the fastest thing on the list and pretend it takes one second. Then multiply everything else by the same factor.

## The table, rescaled

An L1 cache hit is about half a nanosecond, so the factor is two billion.

| Operation | Real time | If L1 took 1 second |
| --- | --- | --- |
| L1 cache hit | 0.5 ns | 1 second |
| Branch mispredict | 5 ns | 10 seconds |
| L2 cache hit | 7 ns | 14 seconds |
| Main memory | 100 ns | 3.3 minutes |
| SSD random read | 150 µs | 3.5 days |
| Round trip in the same datacenter | 500 µs | 11.6 days |
| Disk seek | 10 ms | 7.6 months |
| Packet across an ocean and back | 150 ms | 9.5 years |

These are the classic, order-of-magnitude figures. Modern hardware has moved some of them, SSDs in particular, but the shape of the curve has not changed.

## What it changes in how you think

**A cache miss is a coffee break.** Going from L1 to main memory is the difference between answering a question on the spot and walking to another floor to ask someone. That is why data layout matters so much: an array you walk in order keeps the CPU in the "one second" zone, while a linked list scattered across the heap sends it on a three-minute walk for every node. See [[cache-lines]] and [[false-sharing]].

**The network is a different planet.** A round trip inside the same datacenter costs as much as hundreds of thousands of memory reads. When a design adds one extra network hop per request, it is not adding "a bit of latency". It is adding weeks, on this scale.

**Batching is not an optimisation, it is the default.** If every trip costs eleven days, you don't make the trip for one item. You fill the truck.

## The lesson I keep relearning

Performance work is mostly about not leaving the fast zone without a good reason. Profile first, but when you read the profile, read it with this table in your head.
