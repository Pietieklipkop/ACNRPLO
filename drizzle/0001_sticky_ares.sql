CREATE TABLE `game_counts` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`species` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`method` text DEFAULT 'ground_transect' NOT NULL,
	`conducted_by` text NOT NULL,
	`notes` text,
	`year` integer DEFAULT 2026 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_counts_year_species_idx` ON `game_counts` (`year`,`species`);--> statement-breakpoint
CREATE INDEX `game_counts_date_idx` ON `game_counts` (`date`);--> statement-breakpoint
CREATE TABLE `hunting_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`quota_id` text,
	`species` text NOT NULL,
	`head_count` integer DEFAULT 1 NOT NULL,
	`date` text NOT NULL,
	`hunter_name` text NOT NULL,
	`firearm_caliber` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quota_id`) REFERENCES `quotas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `hunting_logs_user_idx` ON `hunting_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `hunting_logs_date_idx` ON `hunting_logs` (`date`);--> statement-breakpoint
CREATE TABLE `quota_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`quota_id` text NOT NULL,
	`user_id` text NOT NULL,
	`allocated_head` integer DEFAULT 0 NOT NULL,
	`hunted_head` integer DEFAULT 0 NOT NULL,
	`open_to_buy_head` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`quota_id`) REFERENCES `quotas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quota_user_unique_idx` ON `quota_allocations` (`quota_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `quota_alloc_user_idx` ON `quota_allocations` (`user_id`);--> statement-breakpoint
CREATE TABLE `quota_trades` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`quota_id` text NOT NULL,
	`head_count` integer DEFAULT 1 NOT NULL,
	`price_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`buyer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`quota_id`) REFERENCES `quotas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `quota_trades_seller_idx` ON `quota_trades` (`seller_id`);--> statement-breakpoint
CREATE INDEX `quota_trades_buyer_idx` ON `quota_trades` (`buyer_id`);--> statement-breakpoint
CREATE TABLE `quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text DEFAULT 'plo_hunting' NOT NULL,
	`species` text NOT NULL,
	`total_allocation` integer DEFAULT 0 NOT NULL,
	`unit_price_cents` integer DEFAULT 0 NOT NULL,
	`year` integer DEFAULT 2026 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quotas_category_year_idx` ON `quotas` (`category`,`year`);--> statement-breakpoint
CREATE INDEX `quotas_species_idx` ON `quotas` (`species`);