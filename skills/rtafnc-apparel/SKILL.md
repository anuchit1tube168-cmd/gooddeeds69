# RTAFNC Apparel Skill

Use for apparel catalog, size profile, entitlement, ordering, issue/receive, exchange/return, stock and annual rollover.

## Rules
- CORE IDENTITY supplies student key; never copy a public roster into GitHub.
- Verified catalog/rate/order source controls; filename recency alone is not authority.
- Never infer size, entitlement or price.
- Catalog changes are versioned with effective date/year.
- Issued/received history is immutable; corrections are linked transactions.

## Read tools
Catalog by active version, student-safe entitlement/receipt history, authorized stock summary and migration/reconciliation status.

## Write tools
Authorized catalog version creation/activation, student size correction request, order line, issue acknowledgement, exchange/return, controlled stock adjustment. All writes require auth, academic year, audit and idempotency.

## Validation
Item/size/unit must exist in active catalog; quantity positive; entitlement/stock constraints pass; identity verified; same idempotency key cannot duplicate an issue.

## Year rollover
Snapshot at 1 August. Carry verified catalog/rules/size defaults only after review. Keep all transactions in original year. Never clone order/issue rows into a new year.

## Failure
`CATALOG_NOT_VERIFIED`, `IDENTITY_NOT_READY`, `ENTITLEMENT_CONFLICT`, `STOCK_CONFLICT`, `DUPLICATE_REQUEST`, `SCOPE_DENIED` → fail closed.

## Tests
Catalog version switch/rollback, stock equation, entitlement boundary, student isolation, duplicate issue retry, exchange traceability, annual rollover.

## Activation
Read catalog → request/order → issue/stock write, each as separate gate.
