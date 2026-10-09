# Fixtures

Place still images here for analyzer tests. Generated JPEGs in unit tests cover SHA-256 parity.

`malformed/` — truncated and random bytes (QA-8). Workers must not crash or hang.

`c2pa/` — add official C2PA test vectors for the five validation states (QA-7) when available.

`benchmark/` — corpus manifest for the §12 release gate. AI labels stay off until `config.ai_labels_enabled` is true after the gate is recorded.
