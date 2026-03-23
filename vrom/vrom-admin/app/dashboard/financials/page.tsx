'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Lock, ArrowRight, Calendar } from 'lucide-react'

interface Transaction {
  id: string
  type: 'commission' | 'payout' | 'refund' | 'adjustment'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  description: string
  timestamp: string
}

export default function FinancialsPage() {
  const [financialData, setFinancialData] = useState({
    gmv: 2450000,
    commission: 342000,
    escrow: 125000,
    payouts: 287000,
    refunds: 18500,
    taxDue: 45600,
  })

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'TRX001',
      type: 'commission',
      amount: 12450,
      status: 'completed',
      description: 'Commission collected - Order batch #5234',
      timestamp: '2024-03-23 14:30',
    },
    {
      id: 'TRX002',
      type: 'payout',
      amount: 50000,
      status: 'completed',
      description: 'Payout to driver account',
      timestamp: '2024-03-23 12:15',
    },
    {
      id: 'TRX003',
      type: 'refund',
      amount: 2500,
      status: 'pending',
      description: 'Customer refund - Order #9876',
      timestamp: '2024-03-23 10:45',
    },
    {
      id: 'TRX004',
      type: 'commission',
      amount: 8900,
      status: 'completed',
      description: 'Commission from merchant orders',
      timestamp: '2024-03-23 09:20',
    },
    {
      id: 'TRX005',
      type: 'adjustment',
      amount: -1200,
      status: 'completed',
      description: 'Monthly platform fee adjustment',
      timestamp: '2024-03-22 23:00',
    },
  ])

  const [selectedRange, setSelectedRange] = useState('month')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'commission':
        return 'text-green-500'
      case 'payout':
        return 'text-blue-500'
      case 'refund':
        return 'text-orange-500'
      case 'adjustment':
        return 'text-purple-500'
      default:
        return 'text-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Financial Monitoring</h1>
        <p className="text-muted-foreground mt-1">
          Wallet, escrow, payouts, and tax compliance tracking.
        </p>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GMV */}
        <Card className="p-6 glass-dark border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Gross Merchandise Value
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(financialData.gmv)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>+12.5% vs last month</span>
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Commission */}
        <Card className="p-6 glass-dark">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Total Commission
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(financialData.commission)}
              </p>
              <div className="flex items-center gap-1 mt-2 text-green-500 text-sm">
                <TrendingUp className="h-4 w-4" />
                <span>+8.3% vs last month</span>
              </div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </Card>

        {/* Escrow */}
        <Card className="p-6 glass-dark border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Escrow In-Flight
              </p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {formatCurrency(financialData.escrow)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Held in escrow pending settlement
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Financial Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Payouts (This Month)',
            value: financialData.payouts,
            icon: ArrowRight,
            color: 'text-blue-500',
          },
          {
            label: 'Refunds',
            value: financialData.refunds,
            icon: TrendingDown,
            color: 'text-orange-500',
          },
          {
            label: 'Tax Due',
            value: financialData.taxDue,
            icon: Lock,
            color: 'text-purple-500',
          },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <Card key={i} className="p-4 glass-dark">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-current/10 ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(item.value)}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Period Selector and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Period Selection */}
        <Card className="p-6 glass-dark">
          <h3 className="font-semibold text-foreground mb-4">Report Period</h3>
          <div className="space-y-2">
            {['Today', 'Week', 'Month', 'Quarter', 'Year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedRange(period.toLowerCase())}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  selectedRange === period.toLowerCase()
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </Card>

        {/* Financial Summary */}
        <Card className="p-6 glass-dark lg:col-span-2">
          <h3 className="font-semibold text-foreground mb-4">Monthly Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-foreground">Total Revenue:</span>
              <span className="text-lg font-bold text-green-500">
                {formatCurrency(financialData.commission)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground">Operating Costs:</span>
              <span className="text-lg font-bold text-orange-500">
                {formatCurrency(45000)}
              </span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <span className="text-foreground">Net Profit:</span>
              <span className="text-lg font-bold text-blue-500">
                {formatCurrency(financialData.commission - 45000)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground font-medium">Tax Compliance:</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-500">Compliant</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Transactions */}
      <Card className="glass-dark">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-6 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${getTypeColor(transaction.type)}`} />
                    <div>
                      <p className="font-medium text-foreground">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {transaction.timestamp}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <p className={`font-bold ${transaction.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {transaction.amount >= 0 ? '+' : ''}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(transaction.status)}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Chart Placeholder */}
      <Card className="p-6 glass-dark">
        <h3 className="font-semibold text-foreground mb-4">Revenue Trend (Last 30 Days)</h3>
        <div className="h-64 flex items-end justify-center gap-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors"
              style={{
                height: `${Math.random() * 100}%`,
                minHeight: '4px',
              }}
              title={`Day ${i + 1}`}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
