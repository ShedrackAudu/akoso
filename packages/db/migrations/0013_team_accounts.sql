CREATE TABLE "platform"."team_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform"."team_accounts" ADD CONSTRAINT "team_accounts_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_accounts_user_id_idx" ON "platform"."team_accounts" USING btree ("user_id");