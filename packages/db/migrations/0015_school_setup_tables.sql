CREATE SCHEMA "school_setup";
--> statement-breakpoint
CREATE TABLE "school_setup"."academic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_sessions_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "academic_sessions_tenant_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE "school_setup"."arm_subjects" (
	"tenant_id" uuid NOT NULL,
	"arm_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "arm_subjects_tenant_id_arm_id_subject_id_pk" PRIMARY KEY("tenant_id","arm_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "school_setup"."class_arms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"curriculum" text NOT NULL,
	"track" text,
	"form_teacher_membership_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_arms_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "school_setup"."classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"level_id" uuid NOT NULL,
	"name" text NOT NULL,
	"standard_class" text,
	"position" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_tenant_id_unique" UNIQUE("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "school_setup"."levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"stage" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "levels_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "levels_tenant_stage_unique" UNIQUE("tenant_id","stage")
);
--> statement-breakpoint
CREATE TABLE "school_setup"."non_school_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"reason" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_setup"."school_profiles" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"school_types" text[] NOT NULL,
	"motto" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"state" text,
	"lga" text DEFAULT '' NOT NULL,
	"phone" text,
	"email" text,
	"brand_colour" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_setup"."subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"kind" text NOT NULL,
	"nerdc_key" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "subjects_tenant_code_unique" UNIQUE("tenant_id","code")
);
--> statement-breakpoint
CREATE TABLE "school_setup"."terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"number" smallint NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"mid_term_starts_on" date,
	"mid_term_ends_on" date,
	"resumes_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "terms_tenant_session_number_unique" UNIQUE("tenant_id","session_id","number")
);
--> statement-breakpoint
ALTER TABLE "school_setup"."academic_sessions" ADD CONSTRAINT "academic_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."arm_subjects" ADD CONSTRAINT "arm_subjects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."arm_subjects" ADD CONSTRAINT "arm_subjects_arm_fk" FOREIGN KEY ("tenant_id","arm_id") REFERENCES "school_setup"."class_arms"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."arm_subjects" ADD CONSTRAINT "arm_subjects_subject_fk" FOREIGN KEY ("tenant_id","subject_id") REFERENCES "school_setup"."subjects"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms" ADD CONSTRAINT "class_arms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."class_arms" ADD CONSTRAINT "class_arms_class_fk" FOREIGN KEY ("tenant_id","class_id") REFERENCES "school_setup"."classes"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."classes" ADD CONSTRAINT "classes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."classes" ADD CONSTRAINT "classes_level_fk" FOREIGN KEY ("tenant_id","level_id") REFERENCES "school_setup"."levels"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."levels" ADD CONSTRAINT "levels_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."non_school_days" ADD CONSTRAINT "non_school_days_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."school_profiles" ADD CONSTRAINT "school_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."subjects" ADD CONSTRAINT "subjects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."terms" ADD CONSTRAINT "terms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup"."terms" ADD CONSTRAINT "terms_session_fk" FOREIGN KEY ("tenant_id","session_id") REFERENCES "school_setup"."academic_sessions"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arm_subjects_tenant_subject_idx" ON "school_setup"."arm_subjects" USING btree ("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX "class_arms_tenant_class_idx" ON "school_setup"."class_arms" USING btree ("tenant_id","class_id");--> statement-breakpoint
CREATE INDEX "classes_tenant_level_idx" ON "school_setup"."classes" USING btree ("tenant_id","level_id");--> statement-breakpoint
CREATE INDEX "non_school_days_tenant_starts_idx" ON "school_setup"."non_school_days" USING btree ("tenant_id","starts_on");