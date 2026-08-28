CREATE TABLE `whatsappOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whatsappOrderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unit` varchar(12) NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL,
	CONSTRAINT `whatsappOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsappOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`customerName` varchar(180) NOT NULL,
	`customerPhone` varchar(32),
	`fulfillment` enum('pickup','delivery') NOT NULL DEFAULT 'pickup',
	`deliveryAddress` varchar(500),
	`paymentMethod` enum('cash','debit','credit','pix') NOT NULL,
	`status` enum('draft','sent','confirmed','cancelled') NOT NULL DEFAULT 'draft',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsappOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsappOrders_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `whatsappOrderItems` ADD CONSTRAINT `whatsappOrderItems_whatsappOrderId_whatsappOrders_id_fk` FOREIGN KEY (`whatsappOrderId`) REFERENCES `whatsappOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsappOrderItems` ADD CONSTRAINT `whatsappOrderItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsappOrders` ADD CONSTRAINT `whatsappOrders_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `whatsapp_order_items_order_idx` ON `whatsappOrderItems` (`whatsappOrderId`);--> statement-breakpoint
CREATE INDEX `whatsapp_order_items_product_idx` ON `whatsappOrderItems` (`productId`);--> statement-breakpoint
CREATE INDEX `whatsapp_orders_created_at_idx` ON `whatsappOrders` (`createdAt`);--> statement-breakpoint
CREATE INDEX `whatsapp_orders_status_idx` ON `whatsappOrders` (`status`);