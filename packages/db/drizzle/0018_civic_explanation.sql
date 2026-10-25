ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS contributor_explanation text;

UPDATE civic_cases AS c
SET contributor_explanation = s.reliability_notes
FROM civic_sources AS s
WHERE s.case_id = c.id
  AND s.source_type = 'context'
  AND c.contributor_explanation IS NULL
  AND s.reliability_notes IS NOT NULL
  AND btrim(s.reliability_notes) <> '';
