CREATE TABLE "workspace_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"changed_by" uuid NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_history" ADD CONSTRAINT "workspace_history_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_history" ADD CONSTRAINT "workspace_history_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_workspace_history_workspace_id_created_at" ON "workspace_history" USING btree ("workspace_id","created_at");