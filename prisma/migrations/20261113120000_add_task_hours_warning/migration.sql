ALTER TABLE "Task"
ADD COLUMN "hoursWarning" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Task"
SET
    "hoursWarning" = true,
    "description" = regexp_replace(
        "description",
        ' (Warning: Exceeds available hours\.|Heads up: it goes over your daily limit\.)$',
        ''
    )
WHERE "description" ~ ' (Warning: Exceeds available hours\.|Heads up: it goes over your daily limit\.)$';

UPDATE "Task"
SET "description" = regexp_replace(
    "description",
    ' (Warning: Outside regular hours\.|Heads up: it is outside your regular hours\.)$',
    ''
)
WHERE "description" ~ ' (Warning: Outside regular hours\.|Heads up: it is outside your regular hours\.)$';
