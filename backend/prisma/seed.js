"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = seed;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seed() {
    console.log('Seeding loan schemes...');
    const plans = [
        {
            id: 'PLAN_BULLET_01',
            name: 'Bullet Repayment',
            annualInterestRate: 12.0,
            maxLtv: 0.70,
            tenureMonths: 12,
            repaymentType: 'BULLET',
            description: '12 months, interest + principal at maturity',
            isActive: true,
        },
        {
            id: 'PLAN_EMI_01',
            name: 'Monthly EMI',
            annualInterestRate: 10.5,
            maxLtv: 0.75,
            tenureMonths: 12,
            repaymentType: 'EMI',
            description: '12 months, equal monthly instalments',
            isActive: true,
        },
    ];
    for (const plan of plans) {
        const upserted = await prisma.loanScheme.upsert({
            where: { id: plan.id },
            update: {
                name: plan.name,
                annualInterestRate: plan.annualInterestRate,
                maxLtv: Math.min(plan.maxLtv, 0.75), // Never allow LTV above 75%
                tenureMonths: plan.tenureMonths,
                repaymentType: plan.repaymentType,
                description: plan.description,
                isActive: plan.isActive,
            },
            create: {
                id: plan.id,
                name: plan.name,
                annualInterestRate: plan.annualInterestRate,
                maxLtv: Math.min(plan.maxLtv, 0.75),
                tenureMonths: plan.tenureMonths,
                repaymentType: plan.repaymentType,
                description: plan.description,
                isActive: plan.isActive,
            },
        });
        console.log(`Seeded plan: ${upserted.id} - ${upserted.name}`);
    }
    console.log('Seeding completed successfully.');
}
if (require.main === module) {
    seed()
        .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
