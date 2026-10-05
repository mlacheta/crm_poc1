-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('WHATSAPP', 'SIMULATOR');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "channel" "ConversationChannel" NOT NULL DEFAULT 'WHATSAPP';
