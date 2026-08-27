CREATE TABLE `accountsPayable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int,
	`purchaseId` int,
	`description` varchar(180) NOT NULL,
	`dueDate` varchar(10) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`status` enum('open','paid','overdue','cancelled') NOT NULL DEFAULT 'open',
	`paidAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `accountsPayable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyaltyTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`saleId` int,
	`userId` int NOT NULL,
	`type` enum('earn','redeem','adjustment','reversal') NOT NULL,
	`points` int NOT NULL,
	`description` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleReturnItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleReturnId` int NOT NULL,
	`saleItemId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	CONSTRAINT `saleReturnItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleReturns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`saleId` int NOT NULL,
	`cashSessionId` int,
	`userId` int NOT NULL,
	`totalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`reason` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saleReturns_id` PRIMARY KEY(`id`),
	CONSTRAINT `saleReturns_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `salesGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`startsOn` varchar(10) NOT NULL,
	`endsOn` varchar(10) NOT NULL,
	`targetAmount` decimal(12,2) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salesGoals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accountsPayable` ADD CONSTRAINT `accountsPayable_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `accountsPayable` ADD CONSTRAINT `accountsPayable_purchaseId_purchases_id_fk` FOREIGN KEY (`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyaltyTransactions` ADD CONSTRAINT `loyaltyTransactions_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyaltyTransactions` ADD CONSTRAINT `loyaltyTransactions_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyaltyTransactions` ADD CONSTRAINT `loyaltyTransactions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturnItems` ADD CONSTRAINT `saleReturnItems_saleReturnId_saleReturns_id_fk` FOREIGN KEY (`saleReturnId`) REFERENCES `saleReturns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturnItems` ADD CONSTRAINT `saleReturnItems_saleItemId_saleItems_id_fk` FOREIGN KEY (`saleItemId`) REFERENCES `saleItems`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturnItems` ADD CONSTRAINT `saleReturnItems_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturns` ADD CONSTRAINT `saleReturns_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturns` ADD CONSTRAINT `saleReturns_cashSessionId_cashSessions_id_fk` FOREIGN KEY (`cashSessionId`) REFERENCES `cashSessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturns` ADD CONSTRAINT `saleReturns_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `accounts_payable_due_idx` ON `accountsPayable` (`dueDate`);--> statement-breakpoint
CREATE INDEX `accounts_payable_status_idx` ON `accountsPayable` (`status`);--> statement-breakpoint
CREATE INDEX `loyalty_transactions_customer_idx` ON `loyaltyTransactions` (`customerId`);--> statement-breakpoint
CREATE INDEX `loyalty_transactions_created_idx` ON `loyaltyTransactions` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sale_return_items_return_idx` ON `saleReturnItems` (`saleReturnId`);--> statement-breakpoint
CREATE INDEX `sale_return_items_sale_item_idx` ON `saleReturnItems` (`saleItemId`);--> statement-breakpoint
CREATE INDEX `sale_returns_sale_idx` ON `saleReturns` (`saleId`);--> statement-breakpoint
CREATE INDEX `sale_returns_created_idx` ON `saleReturns` (`createdAt`);--> statement-breakpoint
CREATE INDEX `sales_goals_period_idx` ON `salesGoals` (`startsOn`,`endsOn`);