CREATE TABLE `inventoryCounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`systemQuantity` decimal(12,3) NOT NULL,
	`countedQuantity` decimal(12,3) NOT NULL,
	`differenceQuantity` decimal(12,3) NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventoryCounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceHistories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`userId` int NOT NULL,
	`previousSalePrice` decimal(12,2) NOT NULL,
	`newSalePrice` decimal(12,2) NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceHistories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`promotionalPrice` decimal(12,2) NOT NULL,
	`startsOn` varchar(10) NOT NULL,
	`endsOn` varchar(10) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inventoryCounts` ADD CONSTRAINT `inventoryCounts_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventoryCounts` ADD CONSTRAINT `inventoryCounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `priceHistories` ADD CONSTRAINT `priceHistories_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `priceHistories` ADD CONSTRAINT `priceHistories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotions` ADD CONSTRAINT `promotions_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inventory_counts_product_idx` ON `inventoryCounts` (`productId`);--> statement-breakpoint
CREATE INDEX `inventory_counts_created_idx` ON `inventoryCounts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `price_histories_product_idx` ON `priceHistories` (`productId`);--> statement-breakpoint
CREATE INDEX `price_histories_created_idx` ON `priceHistories` (`createdAt`);--> statement-breakpoint
CREATE INDEX `promotions_product_idx` ON `promotions` (`productId`);--> statement-breakpoint
CREATE INDEX `promotions_period_idx` ON `promotions` (`startsOn`,`endsOn`);