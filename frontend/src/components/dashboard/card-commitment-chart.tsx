import {
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import {
  buildCardCommitmentData,
  getWeightedCardCommitmentPercentage,
} from '@/lib/card-commitment';
import { getMonthKey, getTodayDateString } from '@/lib/finance-calculations';
import { formatCurrency, formatPercent } from '@/lib/format';
import { useFinanceStore } from '@/stores/finance-store';

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function mixHex(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const t = Math.min(1, Math.max(0, amount));
  const channel = (a: number, b: number) => Math.round(a + (b - a) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return `#${toHex(channel(start.r, end.r))}${toHex(channel(start.g, end.g))}${toHex(channel(start.b, end.b))}`;
}

/** Verde → lima → âmbar conforme sobe o %; vermelho se estourar. */
function commitmentColor(percent: number) {
  if (percent >= 100) return '#F43F5E';

  const t = Math.min(1, Math.max(0, percent / 100));

  if (t < 0.5) {
    return mixHex('#34D399', '#A3E635', t / 0.5);
  }

  return mixHex('#A3E635', '#FFB800', (t - 0.5) / 0.5);
}

export function CardCommitmentChart() {
  const cards = useFinanceStore((state) => state.profile.cards);
  const expenses = useFinanceStore((state) => state.expenses);
  const settlements = useFinanceStore((state) => state.settlements);
  const monthKey = getMonthKey();
  const today = getTodayDateString();

  const data = buildCardCommitmentData(
    cards,
    expenses,
    settlements,
    monthKey,
    today,
  ).map((item) => ({ ...item, fill: commitmentColor(item.percent) }));

  if (data.length === 0) {
    return (
      <div className='flex h-72 items-center justify-center text-sm text-muted-foreground'>
        Cadastre cartões com limite e vincule despesas para ver o
        comprometimento.
      </div>
    );
  }

  const weightedPercentage = getWeightedCardCommitmentPercentage(data);

  return (
    <div className='flex h-72 min-w-0 flex-col items-center justify-center gap-4'>
      <div className='relative h-48 w-full'>
        <ResponsiveContainer width='100%' height='100%'>
          <RadialBarChart
            cx='50%'
            cy='50%'
            innerRadius='35%'
            outerRadius='100%'
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type='number' domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey='display'
              background={{ fill: 'rgba(255,255,255,0.06)' }}
              cornerRadius={6}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </RadialBar>
            <Tooltip
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--popover-foreground)',
              }}
              formatter={(_value, _name, item) => {
                const payload = item?.payload as
                  | {
                      name: string;
                      committed: number;
                      limit: number;
                      percent: number;
                    }
                  | undefined;
                if (!payload) return [String(_value), 'Comprometido'];

                return [
                  `${formatPercent(payload.percent / 100)} (${formatCurrency(payload.committed)} de ${formatCurrency(payload.limit)})`,
                  payload.name,
                ];
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
          <span className='text-xs text-muted-foreground'>Comprometimento</span>
          <span className='text-sm font-semibold'>
            {formatPercent(weightedPercentage / 100)}
          </span>
        </div>
      </div>

      <div className='max-h-24 w-full space-y-2 overflow-y-auto pr-1'>
        {data.map((item) => (
          <div
            key={item.id}
            className='flex min-w-0 items-center justify-between gap-3 text-sm'
          >
            <div className='flex min-w-0 items-center gap-2'>
              <span
                className='size-2.5 rounded-sm'
                style={{ backgroundColor: item.fill }}
              />
              <span className='min-w-0 truncate text-muted-foreground'>
                {item.name}
              </span>
            </div>
            <span className='shrink-0 font-medium'>
              {formatPercent(item.percent / 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
