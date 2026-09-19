'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { MessageCircle, Award, TrendingUp, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/chat');
    }
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-gray-900">Talk to Earn</span>
          </div>
          <div className="flex gap-4">
            <a
              href="/login"
              className="px-6 py-2 text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              Sign In
            </a>
            <a
              href="/register"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Get Started
            </a>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Chat Naturally,
            <br />
            <span className="text-primary-600">Earn Rewards</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The intelligent chat platform that rewards engaging conversations. No spam, no bots -
            just genuine communication that earns you points.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/register"
              className="px-8 py-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2 text-lg"
            >
              Start Earning Now
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/login"
              className="px-8 py-4 bg-white text-primary-600 border-2 border-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors text-lg"
            >
              Sign In
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="bg-primary-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-7 h-7 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Intelligent Scoring</h3>
            <p className="text-gray-600">
              Advanced 6-signal engagement algorithm analyzes conversation quality, not just message
              count. Earn 0-3 points per message based on engagement.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="bg-green-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <Award className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Anti-Spam Protection</h3>
            <p className="text-gray-600">
              Duplicate detection and spam filters ensure only meaningful conversations earn points.
              Quality over quantity.
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-lg">
            <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Rewards</h3>
            <p className="text-gray-600">
              See your points update instantly as you chat. Track your engagement score and
              transaction history in real-time.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Create Your Account</h3>
                <p className="text-gray-600">
                  Sign up in seconds and start with a welcome bonus. No credit card required.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Start Conversations</h3>
                <p className="text-gray-600">
                  Chat naturally with friends or make new connections. Our AI analyzes engagement in
                  real-time.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="bg-primary-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Earn Points</h3>
                <p className="text-gray-600">
                  Quality conversations earn up to 3 points per message. Watch your balance grow as
                  you engage meaningfully.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-primary-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of users who are already earning rewards through engaging conversations.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-600 rounded-lg font-medium hover:bg-gray-100 transition-colors text-lg"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
