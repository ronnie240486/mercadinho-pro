ALTER TABLE `customers` ADD `loyaltyMode` enum('points','credit') DEFAULT 'points' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `loyaltyPointsBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `loyaltyCreditBalance` decimal(12,2) DEFAULT '0.00' NOT NULL;