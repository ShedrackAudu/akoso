-- Better Auth requires an "account" table even with passwords switched off
-- (sign-in part B, section 8). Team members have no password and no outside sign-in, so
-- it stays empty: a check refuses any password or token, and the app role may only read
-- it.
ALTER TABLE "platform"."team_accounts"
  ADD CONSTRAINT "team_accounts_nothing_stored_check"
  CHECK ("password" IS NULL AND "access_token" IS NULL AND "refresh_token" IS NULL
    AND "id_token" IS NULL);
--> statement-breakpoint
GRANT SELECT ON "platform"."team_accounts" TO akoso_app;
