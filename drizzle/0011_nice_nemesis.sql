CREATE TABLE `googleDriveBackupConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`googleEmail` varchar(320),
	`folderId` varchar(160),
	`folderName` varchar(180) NOT NULL DEFAULT 'Mercadinho Pro - Backups',
	`status` enum('active','revoked','error') NOT NULL DEFAULT 'active',
	`lastBackupAt` timestamp,
	`lastBackupStatus` enum('success','failed'),
	`lastBackupError` text,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `googleDriveBackupConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `googleDriveBackupConnections_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `googleDriveBackupRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`connectionId` int NOT NULL,
	`userId` int NOT NULL,
	`trigger` enum('manual','daily') NOT NULL,
	`status` enum('success','failed') NOT NULL,
	`fileName` varchar(255),
	`googleFileId` varchar(160),
	`sizeBytes` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `googleDriveBackupRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `googleDriveBackupConnections` ADD CONSTRAINT `googleDriveBackupConnections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `googleDriveBackupRuns` ADD CONSTRAINT `gdrive_backup_runs_connection_fk` FOREIGN KEY (`connectionId`) REFERENCES `googleDriveBackupConnections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `googleDriveBackupRuns` ADD CONSTRAINT `gdrive_backup_runs_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `google_drive_backup_status_idx` ON `googleDriveBackupConnections` (`status`);--> statement-breakpoint
CREATE INDEX `google_drive_backup_runs_connection_idx` ON `googleDriveBackupRuns` (`connectionId`);--> statement-breakpoint
CREATE INDEX `google_drive_backup_runs_created_idx` ON `googleDriveBackupRuns` (`createdAt`);
