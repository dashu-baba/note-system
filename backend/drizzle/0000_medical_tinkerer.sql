CREATE TYPE "public"."note_type" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('system_user', 'agency_user');--> statement-breakpoint
CREATE TABLE "agency" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agency_company_name_unique" UNIQUE("company_name")
);
--> statement-breakpoint
CREATE TABLE "agency_user" (
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	CONSTRAINT "agency_user_user_id_company_id_pk" PRIMARY KEY("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"note_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"changed_by" uuid NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"content" text,
	"tags" jsonb,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"note_type" "note_type" NOT NULL,
	"status" "status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes_vote" (
	"user_id" uuid NOT NULL,
	"note_id" uuid NOT NULL,
	CONSTRAINT "notes_vote_user_id_note_id_pk" PRIMARY KEY("user_id","note_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"name" varchar NOT NULL,
	"type" "user_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agency_user" ADD CONSTRAINT "agency_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_user" ADD CONSTRAINT "agency_user_company_id_agency_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."agency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history" ADD CONSTRAINT "history_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history" ADD CONSTRAINT "history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_creator_id_user_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_company_id_agency_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."agency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_vote" ADD CONSTRAINT "notes_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes_vote" ADD CONSTRAINT "notes_vote_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_company_id_agency_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."agency"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agency_company_name" ON "agency" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_history_note_id_created_at" ON "history" USING btree ("note_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notes_creator_id_upvotes_downvotes_created_at" ON "notes" USING btree ("creator_id","upvotes","downvotes","created_at");--> statement-breakpoint
CREATE INDEX "idx_notes_creator_id_title_upvotes_downvotes_created_at" ON "notes" USING btree ("creator_id","title","upvotes","downvotes","created_at");--> statement-breakpoint
CREATE INDEX "idx_notes_company_id_title_upvotes_downvotes_created_at" ON "notes" USING btree ("company_id","title","upvotes","downvotes","created_at");--> statement-breakpoint
CREATE INDEX "idx_notes_company_id_upvotes_downvotes_created_at" ON "notes" USING btree ("company_id","upvotes","downvotes","created_at");--> statement-breakpoint
CREATE INDEX "idx_notes_status_upvotes_downvotes_created_at" ON "notes" USING btree ("status","upvotes","downvotes","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_name" ON "user" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_name_company_id_unique" ON "workspace" USING btree ("name","company_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_name" ON "workspace" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_workspace_name_created_by" ON "workspace" USING btree ("name","created_by");