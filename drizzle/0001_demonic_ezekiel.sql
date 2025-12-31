CREATE TABLE "wallet_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"nonce" text NOT NULL,
	"wallet_address" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "wallet_challenges_nonce_unique" UNIQUE("nonce")
);
--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE INDEX "wallet_challenges_nonce_idx" ON "wallet_challenges" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "wallet_challenges_wallet_address_idx" ON "wallet_challenges" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "wallet_challenges_expires_at_idx" ON "wallet_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "credit_transactions_paymentId_idx" ON "credit_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "donations_idempotency_key_idx" ON "donations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "authenticator_userId_idx" ON "authenticator" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_idempotency_key_unique" UNIQUE("idempotency_key");