ALTER TABLE `user` ADD `color` text;
--> statement-breakpoint
ALTER TABLE `quotas` ADD `subcategory` text DEFAULT 'hunting' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `quotas_subcat_idx` ON `quotas` (`subcategory`);
--> statement-breakpoint
ALTER TABLE `master_visit_categories` ADD `icon` text DEFAULT 'Compass' NOT NULL;
