-- Compteurs de limitation de débit partagés entre les instances de la fonction (cf. ADR-0003).
-- Expand uniquement : nouvelle table, lue et écrite par le seul middleware rateLimit.
CREATE TABLE "rate_limit_hits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY("key","window_start"),
	CONSTRAINT "rate_limit_hits_key_length" CHECK (char_length("rate_limit_hits"."key") <= 64)
);
--> statement-breakpoint
CREATE INDEX "rate_limit_hits_expires_at_idx" ON "rate_limit_hits" USING btree ("expires_at");
