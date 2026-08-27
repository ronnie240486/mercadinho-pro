CREATE TABLE `cashMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cashSessionId` int NOT NULL,
	`saleId` int,
	`userId` int NOT NULL,
	`type` enum('sale','supply','withdrawal','adjustment','cancellation') NOT NULL,
	`paymentMethod` enum('cash','debit','credit','pix','voucher','other'),
	`amount` decimal(12,2) NOT NULL,
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cashMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cashSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openedByUserId` int NOT NULL,
	`closedByUserId` int,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`openingAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`expectedClosingAmount` decimal(12,2),
	`actualClosingAmount` decimal(12,2),
	`differenceAmount` decimal(12,2),
	`openedAt` timestamp NOT NULL DEFAULT (now()),
	`closedAt` timestamp,
	`notes` text,
	CONSTRAINT `cashSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`document` varchar(32),
	`phone` varchar(32),
	`email` varchar(320),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(64),
	`internalCode` varchar(48),
	`name` varchar(180) NOT NULL,
	`description` text,
	`categoryId` int,
	`unit` varchar(12) NOT NULL DEFAULT 'UN',
	`costPrice` decimal(12,2) NOT NULL DEFAULT '0.00',
	`salePrice` decimal(12,2) NOT NULL DEFAULT '0.00',
	`stockQuantity` decimal(12,3) NOT NULL DEFAULT '0.000',
	`minimumStock` decimal(12,3) NOT NULL DEFAULT '0.000',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`),
	CONSTRAINT `products_internalCode_unique` UNIQUE(`internalCode`)
);
--> statement-breakpoint
CREATE TABLE `saleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unitPrice` decimal(12,2) NOT NULL,
	`costPrice` decimal(12,2) NOT NULL,
	`discountAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalAmount` decimal(12,2) NOT NULL,
	CONSTRAINT `saleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salePayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`method` enum('cash','debit','credit','pix','voucher','other') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reference` varchar(120),
	CONSTRAINT `salePayments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`customerId` int,
	`cashSessionId` int,
	`operatorUserId` int NOT NULL,
	`status` enum('completed','cancelled') NOT NULL DEFAULT 'completed',
	`subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
	`discountAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`cancelledAt` timestamp,
	CONSTRAINT `sales_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `stockMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`supplierId` int,
	`saleId` int,
	`userId` int NOT NULL,
	`type` enum('entry','sale','adjustment_in','adjustment_out','return','cancellation') NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`unitCost` decimal(12,2),
	`previousQuantity` decimal(12,3) NOT NULL,
	`currentQuantity` decimal(12,3) NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stockMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legalName` varchar(180) NOT NULL,
	`tradeName` varchar(180),
	`document` varchar(32),
	`contactName` varchar(140),
	`phone` varchar(32),
	`email` varchar(320),
	`notes` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','manager','operator','stockist') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `cashMovements` ADD CONSTRAINT `cashMovements_cashSessionId_cashSessions_id_fk` FOREIGN KEY (`cashSessionId`) REFERENCES `cashSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashMovements` ADD CONSTRAINT `cashMovements_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashMovements` ADD CONSTRAINT `cashMovements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashSessions` ADD CONSTRAINT `cashSessions_openedByUserId_users_id_fk` FOREIGN KEY (`openedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashSessions` ADD CONSTRAINT `cashSessions_closedByUserId_users_id_fk` FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleItems` ADD CONSTRAINT `saleItems_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleItems` ADD CONSTRAINT `saleItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `salePayments` ADD CONSTRAINT `salePayments_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_cashSessionId_cashSessions_id_fk` FOREIGN KEY (`cashSessionId`) REFERENCES `cashSessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales` ADD CONSTRAINT `sales_operatorUserId_users_id_fk` FOREIGN KEY (`operatorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockMovements` ADD CONSTRAINT `stockMovements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cash_movements_session_idx` ON `cashMovements` (`cashSessionId`);--> statement-breakpoint
CREATE INDEX `cash_movements_created_at_idx` ON `cashMovements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `cash_sessions_status_idx` ON `cashSessions` (`status`);--> statement-breakpoint
CREATE INDEX `cash_sessions_opened_at_idx` ON `cashSessions` (`openedAt`);--> statement-breakpoint
CREATE INDEX `categories_active_idx` ON `categories` (`active`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`categoryId`);--> statement-breakpoint
CREATE INDEX `products_active_idx` ON `products` (`active`);--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `saleItems` (`saleId`);--> statement-breakpoint
CREATE INDEX `sale_items_product_idx` ON `saleItems` (`productId`);--> statement-breakpoint
CREATE INDEX `sale_payments_sale_idx` ON `salePayments` (`saleId`);--> statement-breakpoint
CREATE INDEX `sales_created_at_idx` ON `sales` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_operator_idx` ON `sales` (`operatorUserId`);--> statement-breakpoint
CREATE INDEX `sales_cash_session_idx` ON `sales` (`cashSessionId`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stockMovements` (`productId`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stockMovements` (`createdAt`);--> statement-breakpoint
CREATE INDEX `stock_movements_type_idx` ON `stockMovements` (`type`);--> statement-breakpoint
CREATE INDEX `suppliers_name_idx` ON `suppliers` (`legalName`);