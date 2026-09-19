'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import PointsDisplay from '@/components/rewards/PointsDisplay';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function RewardsPage() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <button
            onClick={() => router.push('/chat')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Chat
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Your Rewards</h1>
          <p className="text-gray-600 mt-2">Track your earnings and transaction history</p>
        </div>

        <PointsDisplay />
      </div>
    </div>
  );
}
