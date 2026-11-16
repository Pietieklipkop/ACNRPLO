CREATE TABLE `financial_records` (
	`id` text PRIMARY KEY NOT NULL,
	`account_name` text DEFAULT 'Operating Account' NOT NULL,
	`transaction_type` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `financial_account_idx` ON `financial_records` (`account_name`);--> statement-breakpoint
CREATE INDEX `financial_type_idx` ON `financial_records` (`transaction_type`);--> statement-breakpoint
CREATE INDEX `financial_date_idx` ON `financial_records` (`date`);