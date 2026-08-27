CREATE TABLE `purchaseItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unitCost` decimal(12,2) NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	CONSTRAINT `purchaseItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`supplierId` int NOT NULL,
	`receivedByUserId` int NOT NULL,
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchases_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `stockMovements` MODIFY COLUMN `type` enum('entry','outbound','sale','adjustment_in','adjustment_out','return','cancellation') NOT NULL;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD `purchaseId` int;--> statement-breakpoint
ALTER TABLE `purchaseItems` ADD CONSTRAINT `purchaseItems_purchaseId_purchases_id_fk` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchaseItems` ADD CONSTRAINT `purchaseItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_receivedByUserId_users_id_fk` FOREIGN KEY (`receivedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_idx` ON `purchaseItems` (`purchaseId`);--> statement-breakpoint
CREATE INDEX `purchase_items_product_idx` ON `purchaseItems` (`productId`);--> statement-breakpoint
CREATE INDEX `purchases_created_at_idx` ON `purchases` (`createdAt`);--> statement-breakpoint
CREATE INDEX `purchases_supplier_idx` ON `purchases` (`supplierId`);--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_purchaseId_purchases_id_fk` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `stock_movements_purchase_idx` ON `stockMovements` (`purchaseId`);