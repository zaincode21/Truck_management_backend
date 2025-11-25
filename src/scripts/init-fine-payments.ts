/**
 * Migration script to initialize payment fields for existing fines
 * This script sets remaining_amount for fines that don't have it set
 * Run this once after deploying the payment system
 */

import { prisma } from '../lib/prisma';

async function initFinePayments() {
  try {
    console.log('🔄 Initializing payment fields for existing fines...');

    // Get all fines that don't have remaining_amount set or have null remaining_amount
    const fines = await prisma.fine.findMany({
      where: {
        OR: [
          { remaining_amount: null },
          { paid_amount: null }
        ]
      },
      select: {
        id: true,
        fine_cost: true,
        paid_amount: true,
        remaining_amount: true
      }
    });

    console.log(`📊 Found ${fines.length} fines to update`);

    let updated = 0;
    for (const fine of fines) {
      const paidAmount = fine.paid_amount || 0;
      const remainingAmount = fine.remaining_amount !== null && fine.remaining_amount !== undefined
        ? fine.remaining_amount
        : (fine.fine_cost - paidAmount);

      await prisma.fine.update({
        where: { id: fine.id },
        data: {
          paid_amount: paidAmount,
          remaining_amount: Math.max(0, remainingAmount),
          pay_status: remainingAmount <= 0 ? 'paid' : 'unpaid'
        }
      });

      updated++;
      if (updated % 10 === 0) {
        console.log(`  ✓ Updated ${updated}/${fines.length} fines...`);
      }
    }

    console.log(`✅ Successfully initialized ${updated} fines`);
    console.log('✨ Migration complete!');
  } catch (error) {
    console.error('❌ Error initializing fine payments:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initFinePayments()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { initFinePayments };








