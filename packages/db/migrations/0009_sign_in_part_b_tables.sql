CREATE TABLE "platform"."contact_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"kind" text NOT NULL,
	"check_method" text NOT NULL,
	"evidence" text NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"new_number_ending" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform"."custom_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"permissions" text[] NOT NULL,
	"requires_mfa" boolean DEFAULT false NOT NULL,
	"restricted_approved_by" uuid,
	"restricted_approved_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform"."membership_custom_roles" (
	"tenant_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"custom_role_id" uuid NOT NULL,
	"granted_by" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_custom_roles_unique" UNIQUE("tenant_id","membership_id","custom_role_id")
);
--> statement-breakpoint
CREATE TABLE "platform"."user_backup_phones" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"verified_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_backup_phones_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "platform"."school_settings" (
	"tenant_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "school_settings_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
ALTER TABLE "platform"."memberships" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform"."memberships" ADD COLUMN "ended_reason" text;--> statement-breakpoint
ALTER TABLE "platform"."security_events" ADD COLUMN "caused_by_school_id" uuid;--> statement-breakpoint
ALTER TABLE "platform"."users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "platform"."contact_changes" ADD CONSTRAINT "contact_changes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."contact_changes" ADD CONSTRAINT "contact_changes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."contact_changes" ADD CONSTRAINT "contact_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."custom_roles" ADD CONSTRAINT "custom_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."custom_roles" ADD CONSTRAINT "custom_roles_restricted_approved_by_users_id_fk" FOREIGN KEY ("restricted_approved_by") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."custom_roles" ADD CONSTRAINT "custom_roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."membership_custom_roles" ADD CONSTRAINT "membership_custom_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."membership_custom_roles" ADD CONSTRAINT "membership_custom_roles_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "platform"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."membership_custom_roles" ADD CONSTRAINT "membership_custom_roles_custom_role_id_custom_roles_id_fk" FOREIGN KEY ("custom_role_id") REFERENCES "platform"."custom_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."membership_custom_roles" ADD CONSTRAINT "membership_custom_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."user_backup_phones" ADD CONSTRAINT "user_backup_phones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "platform"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform"."school_settings" ADD CONSTRAINT "school_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_changes_tenant_created_idx" ON "platform"."contact_changes" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_changes_user_idx" ON "platform"."contact_changes" USING btree ("tenant_id","user_id");--> statement-breakpoint
CREATE INDEX "custom_roles_tenant_created_idx" ON "platform"."custom_roles" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "membership_custom_roles_role_idx" ON "platform"."membership_custom_roles" USING btree ("tenant_id","custom_role_id");--> statement-breakpoint
ALTER TABLE "platform"."security_events" ADD CONSTRAINT "security_events_caused_by_school_id_tenants_id_fk" FOREIGN KEY ("caused_by_school_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_events_school_created_idx" ON "platform"."security_events" USING btree ("caused_by_school_id","created_at");