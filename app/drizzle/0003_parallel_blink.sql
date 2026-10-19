CREATE TABLE `card_state` (
	`deck` text NOT NULL,
	`guid` text NOT NULL,
	`due` integer NOT NULL,
	`stability` real NOT NULL,
	`difficulty` real NOT NULL,
	`state` integer NOT NULL,
	`reps` integer NOT NULL,
	`lapses` integer NOT NULL,
	`learning_steps` integer NOT NULL,
	`scheduled_days` integer NOT NULL,
	`last_review` integer NOT NULL,
	PRIMARY KEY(`deck`, `guid`),
	CONSTRAINT "card_state_state_range" CHECK("card_state"."state" between 1 and 3)
);
--> statement-breakpoint
CREATE INDEX `card_state_due` ON `card_state` (`due`);--> statement-breakpoint
CREATE TABLE `review_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deck` text NOT NULL,
	`guid` text NOT NULL,
	`rating` integer NOT NULL,
	`reviewed_at` integer NOT NULL,
	`previous_state` text,
	CONSTRAINT "review_log_rating_range" CHECK("review_log"."rating" between 1 and 4)
);
--> statement-breakpoint
CREATE INDEX `review_log_reviewed_at` ON `review_log` (`reviewed_at`);