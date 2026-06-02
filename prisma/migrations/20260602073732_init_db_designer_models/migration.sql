-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Diagram` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiagramNode` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `x_pos` DOUBLE NOT NULL,
    `y_pos` DOUBLE NOT NULL,
    `node_data_json` JSON NOT NULL,
    `diagramId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DiagramEdge` (
    `id` VARCHAR(191) NOT NULL,
    `source_node` VARCHAR(191) NOT NULL,
    `target_node` VARCHAR(191) NOT NULL,
    `source_cardinality` VARCHAR(191) NOT NULL,
    `target_cardinality` VARCHAR(191) NOT NULL,
    `diagramId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Diagram` ADD CONSTRAINT `Diagram_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiagramNode` ADD CONSTRAINT `DiagramNode_diagramId_fkey` FOREIGN KEY (`diagramId`) REFERENCES `Diagram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DiagramEdge` ADD CONSTRAINT `DiagramEdge_diagramId_fkey` FOREIGN KEY (`diagramId`) REFERENCES `Diagram`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
