-- AlterTable
ALTER TABLE "TimeLog" ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE INDEX "TimeLog_invoiceId_idx" ON "TimeLog"("invoiceId");

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
