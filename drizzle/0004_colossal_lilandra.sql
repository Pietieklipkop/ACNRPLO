CREATE TABLE `master_species` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'plains_game' NOT NULL,
	`default_price_cents` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_species_name_unique` ON `master_species` (`name`);--> statement-breakpoint
CREATE INDEX `master_species_name_idx` ON `master_species` (`name`);--> statement-breakpoint
CREATE TABLE `master_visit_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`color_hex` text DEFAULT '#10b981' NOT NULL,
	`badge_class` text DEFAULT 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `master_visit_categories_key_unique` ON `master_visit_categories` (`key`);--> statement-breakpoint
CREATE INDEX `master_visit_cat_key_idx` ON `master_visit_categories` (`key`);--> statement-breakpoint
CREATE TABLE `quota_buy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`species` text NOT NULL,
	`head_count` integer DEFAULT 1 NOT NULL,
	`offer_price_cents` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`fulfilled_by_user_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`fulfilled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fulfilled_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `quota_buy_user_idx` ON `quota_buy_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `quota_buy_status_idx` ON `quota_buy_requests` (`status`);--> statement-breakpoint
CREATE INDEX `quota_buy_species_idx` ON `quota_buy_requests` (`species`);