ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS restricted_handling boolean NOT NULL DEFAULT false;

UPDATE civic_cases
SET restricted_handling = true
WHERE sensitivity_level = 'restricted' AND restricted_handling = false;
