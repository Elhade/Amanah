import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  valueColor?: string;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
}

export function StatCard({ title, value, icon: Icon, iconColor = 'text-emerald-600', iconBg = 'bg-emerald-50', valueColor = 'text-gray-900', trend, trendUp, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 2xl:p-7 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 truncate">{title}</p>
          <p className={`text-xl sm:text-2xl 2xl:text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {trendUp ? '↑' : '↓'} {trend}
              </span>
            </div>
          )}
        </div>
        <div className={`${iconBg} p-2 sm:p-3 rounded-xl flex-shrink-0 ml-2`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 2xl:w-7 2xl:h-7 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}
