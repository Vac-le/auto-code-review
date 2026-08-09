# Candidate verification protocol

Verify each candidate independently before including it in the final review.

1. Re-read the exact changed hunk and its enclosing symbol.
2. Trace the shortest realistic path from an external input or internal state to the suspected failure.
3. Inspect relevant guards, callers, type definitions, framework guarantees, configuration, and tests.
4. State the triggering preconditions in one sentence. If they require mutually incompatible states, reject the candidate.
5. State the observable failure. If it is only aesthetic or a possible future concern, reject the candidate.
6. Confirm that the reviewed change introduced the behavior, exposed a previously unreachable path, or materially increased its impact.
7. Pin the smallest line range that a maintainer must change to address the root cause.
8. Search the candidate set for the same root cause and merge duplicates.
9. Assign confidence from 0 to 1. Report only confidence of at least 0.80 by default.

Use a second reasoning pass for P0 and P1 candidates. Try to disprove the issue rather than restating it. If evidence remains incomplete, lower the severity or omit the finding.

Never execute untrusted project scripts solely to prove a finding. Tests and builds may be run only when they are already part of the repository's normal verification workflow and permissions allow it.
