'use client';

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export function ReliabilityGauge({ score }: { score: number }) {
  const data = [{ name: 'score', value: score, fill: score >= 75 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' }];
  return (
    <div className="relative h-36 w-36">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius="72%" outerRadius="100%">
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-semibold">{score}</div>
        <div className="text-xs text-muted-foreground">Reliability</div>
      </div>
    </div>
  );
}
