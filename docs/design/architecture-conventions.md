# Architecture conventions not enforced by import linting

`dependency-cruiser` enforces the mechanical import boundaries. Two rules are
deliberately process/code-review conventions because they concern call intent,
not module ownership or an import path:

1. `Evaluator.evaluate()` is publicly typed for composition, but only the
   Backtesting Completion Processor may call it. REST adapters and other
   modules must not invoke it directly.
2. A `Strategy.analyze()` implementation must never call the Sentiment API.
   Backtesting supplies the aligned value through `context.sentiment`; a
   strategy reads that context only.

Reviewers should treat violations of either convention as architecture defects.
