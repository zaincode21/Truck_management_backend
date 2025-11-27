/**
 * Migration script to initialize payment fields for existing fines
 * This script sets remaining_amount for fines that don't have it set
 * Run this once after deploying the payment system
 */
declare function initFinePayments(): Promise<void>;
export { initFinePayments };
//# sourceMappingURL=init-fine-payments.d.ts.map