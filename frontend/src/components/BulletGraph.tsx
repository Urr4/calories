import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export interface BulletGraphProps {
  calories: { value: number; target: number };
  carbs: { value: number; target: number };
  protein: { value: number; target: number };
  fiber: { value: number; target: number };
}

interface Row {
  label: string;
  value: number;
  target: number;
  unit: string;
  pct: number;
  color: string;
}

function buildRow(label: string, unit: string, value: number, target: number, color: string): Row {
  const pct = target > 0 ? (value / target) * 100 : 0;
  return { label, value, target, unit, pct, color };
}

// Bullet-graph-style overview: for each metric, a horizontal bar shows the
// percentage of the daily target reached, with a reference line at 100%.
export default function BulletGraph({ calories, carbs, protein, fiber }: BulletGraphProps) {
  const data: Row[] = [
    buildRow('Kalorien', 'kcal', calories.value, calories.target, '#2e7d32'),
    buildRow('Kohlenhydrate', 'g', carbs.value, carbs.target, '#1565c0'),
    buildRow('Eiweiß', 'g', protein.value, protein.target, '#6a1b9a'),
    buildRow('Ballaststoffe', 'g', fiber.value, fiber.target, '#ef6c00'),
  ];

  const maxPct = Math.max(100, ...data.map((d) => d.pct)) * 1.1;

  return (
    <Box sx={{ px: 1, py: 1 }}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
          <XAxis type="number" domain={[0, maxPct]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={90}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={100} stroke="#333" strokeDasharray="3 3" />
          <Tooltip
            formatter={
              ((_value: unknown, _name: unknown, item: { payload?: Row }) => {
                const row = item?.payload;
                if (!row) return '';
                return [`${Math.round(row.value)} / ${Math.round(row.target)} ${row.unit}`, row.label];
              }) as never
            }
          />
          <Bar dataKey="pct" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((row) => (
              <Cell key={row.label} fill={row.pct > 100 ? '#ed6c02' : row.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
        {data.map((row) => (
          <Typography key={row.label} variant="caption" color="text.secondary">
            {Math.round(row.value)}/{Math.round(row.target)} {row.unit}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
