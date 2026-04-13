# law/ — Federal Authority Corpus (Schema + Packs)

This folder holds the **structured representation of federal law** that A.B.E. uses
to reason about constitutional and statutory scope. It does **not** store full statute
or CFR text. Instead, it stores:

- which Title/Section or CFR Part we’re talking about,
- what powers it grants,
- what it does **not** authorize,
- who it applies to (population),
- preemption rules,
- funding links (which grants depend on it),
- notes for CAE/CDA/CFF/CCRI.

Think of this as the **authority map**, not the law library. CAE and CDA use it to
decide whether a real-world practice is inside or outside lawful scope.

Everything here is static JSON, hashed and inspectable. No servers, no dynamic calls.
