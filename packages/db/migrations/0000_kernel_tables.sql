-- The platform schema is created by the database bootstrap (docker/postgres/init/01-roles.sql
-- locally), owned by the migration role, before any migration runs.
CREATE SCHEMA IF NOT EXISTS "platform";
--> statement-breakpoint
CREATE TABLE "platform"."idempotency_keys" (
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"state" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_tenant_id_user_id_key_pk" PRIMARY KEY("tenant_id","user_id","key")
);
--> statement-breakpoint
CREATE TABLE "platform"."rate_limit_windows" (
	"bucket" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "rate_limit_windows_bucket_window_start_pk" PRIMARY KEY("bucket","window_start")
);
