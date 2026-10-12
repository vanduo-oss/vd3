# Development audit exceptions

Approved by the maintainer on 2026-10-08 for the vd3 ecosystem security pass.
Owner: vanduo-oss. Review at the next dependency update or release and no later
than 2026-12-31, or sooner if a patched path ships.

## braces — CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm

- Installed path: `stylelint > micromatch > braces@3.0.3`.
- Issue: deeply nested brace patterns can exhaust the Node call stack and crash a process.
- Patched version: none reported by the registry/advisory at approval time.
- Scope: development tooling only. The published library has no consumer runtime
  dependencies and only a Vue peer. Stylelint runs against repository-owned CSS
  glob patterns. Accepting this advisory does not fix braces: a development tool
  given an attacker-controlled pathological pattern can still crash.

CI uses the pinned pnpm 10.28.2 command:

```sh
pnpm audit --audit-level=moderate --ignore GHSA-vfj7-8cjw-p6xm
```

Only this GitHub advisory is excluded from the pnpm gate. pnpm 10.28.2 does
not enforce the former `auditConfig.ignoreCves` workspace setting, so the
exception is explicit in CI. An unfiltered
`pnpm audit --audit-level=moderate` continues to expose the advisory.

## uri-js — CVE-2026-93690 / CVE-2026-93751 / CVE-2026-103387

- Installed path: `eslint > ajv > uri-js@4.4.1` (and eslint plugin/parser peers).
- Issue: infinite-loop / encoding / uncaught-exception classes in URI parsing
  when fed attacker-controlled input through ajv's URI helpers.
- Patched version: none reported by Snyk at approval time (`fixedIn: []`).
- Scope: development tooling only (eslint). Lint runs on repository-owned
  TypeScript/Vue sources, not on untrusted network input. pnpm's advisory
  database does not currently fail this tree at moderate+; Snyk Open Source
  with `--dev` still reports the family. Keep the organization policy narrow
  to the three reviewed IDs — do not suppress fixable findings.

## Snyk organization policy

Org: `vanduo-oss-default` on EU (`https://app.eu.snyk.io/org/vanduo-oss-default`).

The live organization-specific policy contains exactly these reviewed IDs:

- `SNYK-JS-BRACES-19963945`
- `SNYK-JS-URIJS-19963961`
- `SNYK-JS-URIJS-19963963`
- `SNYK-JS-URIJS-20341609`

The policy has no automatic expiry and no unpatched-only condition. It must be
reviewed and removed manually by 2026-12-31, with each ID removed earlier when
a supported patched path becomes available. It must not be broadened to
fixable findings or MPL-2.0 license findings.

JavaScript dev-dependency scanning is enabled for npm, Yarn, and pnpm.
Submitted Consistent Ignores expire on 2026-12-31 and use type
`not-vulnerable`:

   | Finding ID | Path | Rationale |
   | --- | --- | --- |
   | `b124515f-b900-4ff4-9f8a-2de5d67e263b` | `tests/components/vd-sign-up.spec.ts` | Test fixture password |
   | `577cfa10-a650-4a44-8a33-cb248ba5e3ce` | `tests/components/vd-sign-up.spec.ts` | Test fixture password |
   | `ea09e1a1-8e7a-4715-87b6-11c227cfc08f` | `scripts/check-class-coverage.mjs` | Trusted local CLI path |

Local scanner noise: exclude `.kilo/` (gitignored local worktrees) from
`snyk test --all-projects` / Code scans. Stale worktree manifests are not part
of the published tree and can reintroduce already-fixed advisories.

## Removal conditions

- Recheck at the next dependency update or release.
- Remove each exception as soon as a supported patched path is available and
  the quality checks pass.
- Reassess earlier if the affected tool starts processing untrusted patterns
  or the affected code enters a published runtime dependency.
- Exceptions must not be copied to a different advisory or environment without
  a separate review.
