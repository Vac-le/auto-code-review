# Severity rubric

Classify impact, not code style.

| Priority | Use when | Typical examples |
| --- | --- | --- |
| P0 | The change can immediately cause widespread compromise, irreversible data loss, or a system-wide outage under ordinary operation. | Authentication bypass affecting all users, destructive migration with no recovery path. |
| P1 | The change can cause serious production failure, security exposure, or data corruption for a realistic path and should block merge. | Tenant escape, lost writes, deadlock, broken rollback, common-path crash. |
| P2 | The change causes incorrect behavior or meaningful degradation in a bounded scenario and should normally be fixed before release. | Incorrect edge-case result, leaked resource under repeatable load, incompatible API response. |
| P3 | The change creates a low-impact but concrete defect with clear evidence. It is not a preference or speculative hardening idea. | Misleading error for a valid input, narrowly scoped missing guard with observable impact. |

Do not report:

- formatting, naming, or subjective readability preferences;
- issues already enforced by routine formatter, linter, or type checker unless the change bypasses that enforcement;
- missing tests without an identified unprotected behavior;
- theoretical attacks without a reachable trust boundary;
- pre-existing problems that the change does not make newly reachable or materially worse.

When uncertain between priorities, choose the lower priority. When uncertain that a defect exists, omit it.
