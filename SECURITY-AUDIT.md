# Development audit exception

Approved by the maintainer on 2026-10-04 for the 1.7.5 release preparation.

- Advisory: [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).
- Installed path: `stylelint > micromatch > braces@3.0.3`.
- Issue: deeply nested brace patterns can exhaust the Node call stack and crash a process.
- Patched version: none reported by the registry/advisory at approval time.

This path is development tooling. The published library has no consumer runtime
dependencies and only a Vue peer. Stylelint runs against repository-owned CSS
glob patterns. Accepting this advisory does not fix braces: a development tool
given an attacker-controlled pathological pattern can still crash.

CI uses the pinned pnpm 10.28.2 command:

```sh
pnpm audit --audit-level=moderate --ignore CVE-2026-93687
```

Only this CVE is excluded. CI still audits development dependencies and blocks
every other moderate/high/critical advisory, including unfixable ones. It does
not use `--prod`, `--ignore-unfixable` or `continue-on-error`. Install safeguards,
dependency patch floors and all code/build/coverage/size gates remain enabled.
An unfiltered `pnpm audit --audit-level=moderate` continues to expose the advisory.

Recheck at the next dependency update or release. Remove the exception as soon
as a supported patched path is available and the quality checks pass. Reassess
earlier if this tool starts processing untrusted patterns or the affected code
enters a published runtime dependency. This exception must not be copied to a
different advisory or environment without a separate review.
