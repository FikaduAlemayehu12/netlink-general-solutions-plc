// Ethiopian income tax brackets (2024) - progressive tax
// Based on Ethiopian Revenue & Customs Authority

export interface DeductionBreakdown {
  grossSalary: number;
  incomeTax: number;
  pensionEmployee: number; // 7% employee contribution
  pensionEmployer: number; // 11% employer contribution
  totalDeductions: number;
  netSalary: number;
}

// Ethiopian progressive income tax brackets (monthly)
const TAX_BRACKETS = [
  { min: 0, max: 600, rate: 0, deduction: 0 },
  { min: 601, max: 1650, rate: 0.10, deduction: 60 },
  { min: 1651, max: 3200, rate: 0.15, deduction: 142.5 },
  { min: 3201, max: 5250, rate: 0.20, deduction: 302.5 },
  { min: 5251, max: 7800, rate: 0.25, deduction: 565 },
  { min: 7801, max: 10900, rate: 0.30, deduction: 955 },
  { min: 10901, max: Infinity, rate: 0.35, deduction: 1500 },
];

export function calculateEthiopianIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
      return Math.round((taxableIncome * bracket.rate - bracket.deduction) * 100) / 100;
    }
  }
  // Fallback to highest bracket
  const last = TAX_BRACKETS[TAX_BRACKETS.length - 1];
  return Math.round((taxableIncome * last.rate - last.deduction) * 100) / 100;
}

export function calculateDeductions(grossSalary: number): DeductionBreakdown {
  const pensionEmployee = Math.round(grossSalary * 0.07 * 100) / 100; // 7%
  const pensionEmployer = Math.round(grossSalary * 0.11 * 100) / 100; // 11%
  
  // Taxable income = gross - employee pension contribution
  const taxableIncome = grossSalary - pensionEmployee;
  const incomeTax = calculateEthiopianIncomeTax(taxableIncome);
  
  const totalDeductions = Math.round((incomeTax + pensionEmployee) * 100) / 100;
  const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

  return {
    grossSalary: Math.round(grossSalary * 100) / 100,
    incomeTax,
    pensionEmployee,
    pensionEmployer,
    totalDeductions,
    netSalary,
  };
}

export function getTaxBracketLabel(taxableIncome: number): string {
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome >= bracket.min && taxableIncome <= bracket.max) {
      return `${(bracket.rate * 100).toFixed(0)}%`;
    }
  }
  return "35%";
}
