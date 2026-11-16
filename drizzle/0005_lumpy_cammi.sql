CREATE TABLE IF NOT EXISTS `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`relationship` text DEFAULT 'family' NOT NULL,
	`sponsoring_main_plo_user_id` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`sponsoring_main_plo_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `invitations_token_unique` ON `invitations` (`token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invitations_token_idx` ON `invitations` (`token`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `invitations_sponsor_idx` ON `invitations` (`sponsoring_main_plo_user_id`);