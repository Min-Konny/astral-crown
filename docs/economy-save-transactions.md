# Economy save failure verification

Local candidate, not published. No balance, rewards, real payments or save schema changes.

## Reproduction and fix

Fresh isolated preview contexts at 1280px and 390px injected a failing sessionStorage write. Both purchase and ascension previously continued to their success UI despite the failed write. The first QA fixture had an invalid synthetic promotion record and was corrected before the successful reproduction; no player data was involved.

Purchase, ascension, facility upgrades and mail claims now mutate a cloned state and commit it in one storage write. The app replaces its state and shows completion only after success. Failure keeps the confirmation available with an error and retry. Training uses the same underlying transaction without changing its existing return contract. Passive income continues independently; this change does not promise rollback of elapsed time.

## Checks

- 105 tests pass; 28-file build succeeds. Four new cases cover repeated write failures, unchanged original state and stored data, retry, exact resource changes, restored state, collection/training preservation and one-time ascension/mail conditions.
- Actual headless Chrome, fresh preview contexts: PC/390 purchase and ascension fail without success UI; retry succeeds; double clicking the old confirmation does not duplicate the operation; reload preserves gems, spending, season, seals, collection and levels. No page errors.
- Failure screenshots inspected for readable text, available retry and no clipped controls. QA script/results/screenshots remain in ignored artifacts, outside the build allowlist.
- Real saves, user browsers and user servers untouched. QA contexts and the temporary loopback server close automatically.

Physical phones, listening tests and full-frame luminance measurements are not covered. No commit, push or deployment in this pass. Progression timing analysis and titles remain separate future work.
