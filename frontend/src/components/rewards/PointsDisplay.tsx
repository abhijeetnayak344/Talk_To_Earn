'use client';

import { useEffect, useState } from 'react';
import { rewardsAPI } from '@/lib/api';
import { PointTransaction } from '@/types';
import { Award, TrendingUp, Loader2, Coins } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function PointsDisplay() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        rewardsAPI.getBalance(),
        rewardsAPI.getTransactions(20, 0),
      ]);

      setBalance(balanceRes.data.balance);
      setTransactions(transactionsRes.data.transactions);
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast.error('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm font-medium mb-2">Your Balance</p>
            <h2 className="text-5xl font-bold">{balance.toLocaleString()}</h2>
            <p className="text-primary-100 mt-2">Points</p>
          </div>
          <Coins className="w-20 h-20 text-primary-200 opacity-50" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Earned</p>
              <p className="text-2xl font-bold text-gray-900">
                {transactions
                  .filter((t) => t.transaction_type === 'earn')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Coins className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Avg per Transaction</p>
              <p className="text-2xl font-bold text-gray-900">
                {transactions.length > 0
                  ? Math.round(
                      transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
                    )
                  : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No transactions yet. Start chatting to earn points!
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      transaction.transaction_type === 'earn'
                        ? 'bg-green-100'
                        : transaction.transaction_type === 'bonus'
                        ? 'bg-blue-100'
                        : 'bg-red-100'
                    }`}
                  >
                    {transaction.transaction_type === 'earn' ||
                    transaction.transaction_type === 'bonus' ? (
                      <TrendingUp
                        className={`w-5 h-5 ${
                          transaction.transaction_type === 'earn'
                            ? 'text-green-600'
                            : 'text-blue-600'
                        }`}
                      />
                    ) : (
                      <Award className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div
                  className={`text-lg font-bold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.amount > 0 ? '+' : ''}
                  {transaction.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
