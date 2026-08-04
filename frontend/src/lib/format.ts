const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatPercent(value: number) {
  return percentFormatter.format(value);
}

export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function parseCurrencyInput(value: string) {
  const cleaned = value.trim().replace(/^R\$\s*/i, '');
  if (!cleaned || !/^\d[\d.,]*$/.test(cleaned)) return 0;

  const commaIndex = cleaned.indexOf(',');
  if (commaIndex >= 0) {
    if (cleaned.indexOf(',', commaIndex + 1) >= 0) return 0;

    const integerPart = cleaned.slice(0, commaIndex);
    const decimalPart = cleaned.slice(commaIndex + 1);
    if (!/^\d+$/.test(decimalPart) || decimalPart.length > 2) return 0;
    if (
      !/^\d+$/.test(integerPart) &&
      !/^\d{1,3}(?:\.\d{3})+$/.test(integerPart)
    ) {
      return 0;
    }

    const parsed = Number(`${integerPart.replace(/\./g, '')}.${decimalPart}`);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const dotCount = (cleaned.match(/\./g) ?? []).length;
  if (dotCount === 0) {
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (dotCount === 1) {
    const [integerPart, decimalPart] = cleaned.split('.');
    if (!integerPart || !decimalPart) return 0;
    if (decimalPart.length <= 2 && /^\d+$/.test(integerPart)) {
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  if (/^\d{1,3}(?:\.\d{3})+$/.test(cleaned)) {
    const parsed = Number(cleaned.replace(/\./g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}
