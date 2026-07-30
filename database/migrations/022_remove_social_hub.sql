BEGIN;

UPDATE transactions
SET visibility = 'private'
WHERE visibility <> 'private';

DELETE FROM transaction_viewers;
DELETE FROM social_events;

DROP TABLE IF EXISTS social_comments CASCADE;
DROP TABLE IF EXISTS user_reports CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS financial_groups CASCADE;

COMMIT;
