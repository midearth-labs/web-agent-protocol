# PRD Clarification Questions

## All Clarifications Resolved ✅

All clarification questions have been answered and incorporated into PRD v2.0:

1. ✅ **Priority Values**: Named levels: low, medium, high, urgent (in priority order). Default is "medium" if not specified on creation. On update, must always be set to a valid value.
2. ✅ **Filter Combination Logic**: Option A - AND logic (all filters must match)
3. ✅ **Bulk Operation Error Handling**: Atomic (all or nothing) - if any todo fails, entire operation is rolled back
4. ✅ **Search Behavior**: Story 8 "Search Todos" removed - Story 5 "List and Filter Todos" covers all needed behavior with comprehensive filtering
5. ✅ **Empty or Default Values**: Priority always has a value (defaults to "medium" if not specified), required in data model
6. ✅ **Modified At Timestamp**: Updated only on successful update operations that result in actual changes
7. ✅ **Date Format**: YYYY-MM-DD (ISO 8601 date format)
8. ✅ **Filter Operator Syntax**: Implementation detail, will be designed in technical stage
9. ✅ **Case Sensitivity**: String filters (contains, notContains) are case-insensitive
10. ✅ **Bulk Operations Limits**: Maximum 100 todos per bulk operation
11. ✅ **Stored vs Calculated Status**: Stored status is never automatically updated to `due`; filtering works on calculated status
12. ✅ **Uniqueness Constraints**: No uniqueness constraints on any fields

---

## No Outstanding Clarifications

All product-level clarifications have been addressed. The PRD is complete and ready for technical design phase.
