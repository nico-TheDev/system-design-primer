CREATE TABLE `progress` (
	`kind` text NOT NULL,
	`item_id` text NOT NULL,
	`completed_at` integer NOT NULL,
	PRIMARY KEY(`kind`, `item_id`)
);
--> statement-breakpoint
DROP TABLE `app_meta`;