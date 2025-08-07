import React from 'react'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  icon: LucideIcon
  iconColor: string
  items: any[]
  valueKey: string
  valuePrefix?: string
  valueColor: string
}

export default function MarketSummaryCard({
  title,
  icon: Icon,
  iconColor,
  items,
  valueKey,
  valuePrefix = '',
  valueColor,
}: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div>
              <span className="font-medium">{item.symbol}</span>
              <span className="text-sm text-gray-600 ml-2">${item.price}</span>
            </div>
            <span className={`text-sm font-medium ${valueColor}`}>
              {valuePrefix}{item[valueKey]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}