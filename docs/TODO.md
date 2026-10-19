# TODO

## Later phases

- **Host trust badge ("Superhost"-style).** Show host trust publicly as a badge.
  Inputs: response rate and speed, cancellation/no-show rate, review reply
  rate, turnover reliability. In the meantime host trust stays an internal
  ranking input only. See the reviews/marketplace algorithm brainstorm.

## Reviews, next steps

- **Marketplace ranking layer.** `rankingScore` is only one input; combine it
  with relevance, availability fit, price fit, host trust and an exploration
  boost for new units (e.g. +15% for the first 5 verified stays or 60 days).
- **Cached scores.** `unit_scores` / `workspace_scores` with `computed_at` and
  `algo_version`, recomputed on review write and nightly for decay, once
  computing on read gets slow.
- **Notify and nudge.** Email or message the host on a new review; send the
  review link automatically after checkout so hosts can't cherry-pick who is
  asked. Alert on low ratings and create a follow-up task.
- **Report a review.** A public report button that routes to L1, and L1 hiding
  that outranks the host's.
- **Abuse checks.** Burst and similarity detection on open-link reviews; ban
  repeat offenders by fingerprint.
- **Multi-unit stays.** Decide one review per reservation or per unit stayed.
- **Review trends** on the dashboard and in Reports.
