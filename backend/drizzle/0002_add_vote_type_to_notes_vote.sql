CREATE TYPE "public"."vote_type" AS ENUM('upvote', 'downvote');--> statement-breakpoint
ALTER TABLE "notes_vote" ADD COLUMN "vote_type" "vote_type" NOT NULL;