CREATE TABLE `productBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`purchaseId` int,
	`supplierId` int,
	`code` varchar(80),
	`expirationDate` varchar(10),
	`initialQuantity` decimal(12,3) NOT NULL,
	`availableQuantity` decimal(12,3) NOT NULL,
	`status` enum('active','depleted','expired','discarded') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productBatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `stockMovements` MODIFY COLUMN `type` enum('entry','outbound','loss','sale','adjustment_in','adjustment_out','return','cancellation') NOT NULL;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD `batchId` int;--> statement-breakpoint
ALTER TABLE `productBatches` ADD CONSTRAINT `productBatches_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productBatches` ADD CONSTRAINT `productBatches_purchaseId_purchases_id_fk` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productBatches` ADD CONSTRAINT `productBatches_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_batches_product_idx` ON `productBatches` (`productId`);--> statement-breakpoint
CREATE INDEX `product_batches_expiration_idx` ON `productBatches` (`expirationDate`);--> statement-breakpoint
CREATE INDEX `product_batches_status_idx` ON `productBatches` (`status`);--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_batchId_productBatches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `productBatches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stock_movements_batch_idx` ON `stockMovements` (`batchId`);