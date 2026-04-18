// Ethiopian banks and mobile money providers for payroll
export const ETHIOPIAN_BANKS = [
  { value: "cbe", label: "Commercial Bank of Ethiopia (CBE)" },
  { value: "dashen", label: "Dashen Bank" },
  { value: "awash", label: "Awash Bank" },
  { value: "abyssinia", label: "Bank of Abyssinia" },
  { value: "wegagen", label: "Wegagen Bank" },
  { value: "nib", label: "Nib International Bank" },
  { value: "coop_oromia", label: "Cooperative Bank of Oromia" },
  { value: "lion", label: "Lion International Bank" },
  { value: "oromia_intl", label: "Oromia International Bank" },
  { value: "bunna", label: "Bunna Bank" },
  { value: "berhan", label: "Berhan Bank" },
  { value: "abay", label: "Abay Bank" },
  { value: "addis_intl", label: "Addis International Bank" },
  { value: "enat", label: "Enat Bank" },
  { value: "zamzam", label: "ZamZam Bank" },
  { value: "hijra", label: "Hijra Bank" },
  { value: "shabelle", label: "Shabelle Bank" },
  { value: "tsehay", label: "Tsehay Bank" },
  { value: "goh_betoch", label: "Goh Betoch Bank" },
  { value: "siinqee", label: "Siinqee Bank" },
];

export const MOBILE_PROVIDERS = [
  { value: "telebirr", label: "Telebirr" },
  { value: "mpesa", label: "M-Pesa Ethiopia" },
  { value: "cbe_birr", label: "CBE Birr" },
  { value: "hellocash", label: "HelloCash" },
];

export const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
];

export function getBankLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return [...ETHIOPIAN_BANKS, ...MOBILE_PROVIDERS].find(b => b.value === value)?.label || value;
}
