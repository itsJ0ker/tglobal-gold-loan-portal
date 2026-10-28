import { prisma } from './db.service';

export class SchemeService {
  /**
   * Fetches all active loan schemes. Guarantees max LTV never exceeds 0.75 (75%).
   */
  static async getActiveSchemes() {
    const schemes = await prisma.loanScheme.findMany({
      where: { isActive: true },
      orderBy: { annualInterestRate: 'asc' },
    });

    return schemes.map((s) => ({
      id: s.id,
      name: s.name,
      annualInterestRate: s.annualInterestRate,
      maxLtv: Math.min(s.maxLtv, 0.75),
      tenureMonths: s.tenureMonths,
      repaymentType: s.repaymentType,
      description: s.description,
    }));
  }

  /**
   * Finds a scheme by ID. Returns null if not found.
   */
  static async getSchemeById(id: string) {
    const scheme = await prisma.loanScheme.findUnique({
      where: { id },
    });

    if (!scheme || !scheme.isActive) {
      return null;
    }

    return {
      ...scheme,
      maxLtv: Math.min(scheme.maxLtv, 0.75),
    };
  }
}
