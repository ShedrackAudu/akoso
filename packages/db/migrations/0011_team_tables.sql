CREATE TABLE "platform"."team_audit_chain_head" (
	"id" integer PRIMARY KEY NOT NULL,
	"last_seq" bigint NOT NULL,
	"last_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."team_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigint NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" text,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL,
	CONSTRAINT "team_audit_events_seq_unique" UNIQUE("seq")
);
--> statement-breakpoint
CREATE TABLE "platform"."team_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "platform"."team_passkeys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" uuid NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"aaguid" text,
	CONSTRAINT "team_passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "platform"."team_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."team_role_grants" (
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_role_grants_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "platform"."team_security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" text NOT NULL,
	"detail" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."team_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "team_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "platform"."team_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT true NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	CONSTRAINT "team_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "platform"."team_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform"."team_invitations" ADD CONSTRAINT "team_invitations_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_invitations" ADD CONSTRAINT "team_invitations_created_by_team_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_passkeys" ADD CONSTRAINT "team_passkeys_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_recovery_codes" ADD CONSTRAINT "team_recovery_codes_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_role_grants" ADD CONSTRAINT "team_role_grants_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_role_grants" ADD CONSTRAINT "team_role_grants_granted_by_team_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_security_events" ADD CONSTRAINT "team_security_events_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."team_sessions" ADD CONSTRAINT "team_sessions_user_id_team_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."team_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_invitations_user_id_idx" ON "platform"."team_invitations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_passkeys_user_id_idx" ON "platform"."team_passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_recovery_codes_user_id_idx" ON "platform"."team_recovery_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_security_events_created_idx" ON "platform"."team_security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "team_security_events_user_created_idx" ON "platform"."team_security_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "team_sessions_user_id_idx" ON "platform"."team_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "team_verifications_identifier_idx" ON "platform"."team_verifications" USING btree ("identifier");