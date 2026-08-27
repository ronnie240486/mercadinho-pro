CREATE TABLE `saleItemBatchAllocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleItemId` int NOT NULL,
	`batchId` int NOT NULL,
	`quantity` decimal(12,3) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saleItemBatchAllocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `saleReturns` ADD `refundMethod` enum('cash','debit','credit','pix','voucher','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `saleItemBatchAllocations` ADD CONSTRAINT `saleItemBatchAllocations_saleItemId_saleItems_id_fk` FOREIGN KEY (`saleItemId`) REFERENCES `saleItems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleItemBatchAllocations` ADD CONSTRAINT `saleItemBatchAllocations_batchId_productBatches_id_fk` FOREIGN KEY (`batchId`) REFERENCES `productBatches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sale_item_batch_allocations_item_idx` ON `saleItemBatchAllocations` (`saleItemId`);--> statement-breakpoint
CREATE INDEX `sale_item_batch_allocations_batch_idx` ON `saleItemBatchAllocations` (`batchId`);