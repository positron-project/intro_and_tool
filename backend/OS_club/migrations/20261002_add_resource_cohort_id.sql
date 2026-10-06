-- Give each cohort-owned resource an explicit owner cohort.
-- A NULL cohort_id means the resource is global (for example, created by Leader/Admin).
ALTER TABLE resources
    ADD COLUMN cohort_id INT NULL AFTER updated_by,
    ADD INDEX ix_resources_cohort_id (cohort_id),
    ADD CONSTRAINT fk_resources_cohort_id
        FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Existing member/contributor resources belong to the creator's current cohort.
-- Global Leader/Admin resources remain global and are not guessed from their profile cohort.
UPDATE resources AS resource
JOIN users AS creator ON creator.id = resource.created_by
JOIN cohorts AS cohort ON cohort.year = creator.cohort
SET resource.cohort_id = cohort.id
WHERE creator.role IN ('Member', 'Contributor', 'CohortLeader')
  AND resource.cohort_id IS NULL;
