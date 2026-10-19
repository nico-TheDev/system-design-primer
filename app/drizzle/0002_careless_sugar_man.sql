CREATE TABLE `practice_session` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` text NOT NULL,
	`status` text NOT NULL,
	`step` integer NOT NULL,
	`revealed` integer DEFAULT false NOT NULL,
	`elapsed_ms` integer DEFAULT 0 NOT NULL,
	`running_since` integer,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`duration_ms` integer,
	CONSTRAINT "practice_session_step_range" CHECK("practice_session"."step" between 1 and 4)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `practice_session_one_active` ON `practice_session` (`exercise_id`) WHERE "practice_session"."status" = 'active';--> statement-breakpoint
CREATE INDEX `practice_session_exercise` ON `practice_session` (`exercise_id`);