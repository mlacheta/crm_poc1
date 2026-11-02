-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'ERROR', 'DISCONNECTED');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "whatsappAccessToken" TEXT,
ADD COLUMN     "whatsappConnectedAt" TIMESTAMP(3),
ADD COLUMN     "whatsappDisplayPhone" TEXT,
ADD COLUMN     "whatsappQualityRating" TEXT,
ADD COLUMN     "whatsappStatus" "WhatsAppStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
ADD COLUMN     "whatsappStatusDetail" TEXT;
