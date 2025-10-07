import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Check, Crown, Zap } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  max_projects: number;
  max_bases: number;
  max_records_per_base: number;
  max_storage_mb: number;
  features: any;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    setLoading(true);

    const [plansResult, subResult] = await Promise.all([
      supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true }),
      supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (plansResult.data) {
      setPlans(plansResult.data);
    }

    if (subResult.data) {
      setCurrentSubscription(subResult.data);
      const plan = plansResult.data?.find(p => p.id === subResult.data.plan_id);
      setCurrentPlan(plan || null);
    }

    setLoading(false);
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };

  const getPlanIcon = (planName: string) => {
    if (planName === 'Enterprise') return <Crown className="text-yellow-500" size={24} />;
    if (planName === 'Pro') return <Zap className="text-blue-500" size={24} />;
    return <Check className="text-gray-500" size={24} />;
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    alert(`To upgrade to ${plan.name}, please contact support or visit our billing portal.\n\nThis would integrate with Stripe for payment processing.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h2>
        <p className="text-gray-600">
          {currentPlan ? `You're currently on the ${currentPlan.name} plan` : 'Select the perfect plan for your needs'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan?.id === plan.id;
          const isFree = plan.name === 'Free';

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border-2 p-8 transition-all ${
                isCurrentPlan
                  ? 'border-blue-500 shadow-xl scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {getPlanIcon(plan.name)}
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                </div>
                {isCurrentPlan && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                    Current
                  </span>
                )}
              </div>

              <div className="mb-6">
                {isFree ? (
                  <div className="text-4xl font-bold text-gray-900">Free</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ${formatPrice(plan.price_monthly)}
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      or ${formatPrice(plan.price_yearly)}/year (save 17%)
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <Check size={18} className="text-green-500 flex-shrink-0" />
                  <span>
                    {plan.max_projects === -1 ? 'Unlimited' : plan.max_projects} project{plan.max_projects !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check size={18} className="text-green-500 flex-shrink-0" />
                  <span>
                    {plan.max_bases === -1 ? 'Unlimited' : plan.max_bases} bases
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check size={18} className="text-green-500 flex-shrink-0" />
                  <span>
                    {plan.max_records_per_base === -1 ? 'Unlimited' : plan.max_records_per_base.toLocaleString()} records per base
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Check size={18} className="text-green-500 flex-shrink-0" />
                  <span>{plan.max_storage_mb}MB storage</span>
                </div>

                {plan.features && Object.entries(plan.features).map(([key, value]) => {
                  if (value === true) {
                    return (
                      <div key={key} className="flex items-center gap-3 text-sm">
                        <Check size={18} className="text-green-500 flex-shrink-0" />
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  }
                  if (typeof value === 'string') {
                    return (
                      <div key={key} className="flex items-center gap-3 text-sm">
                        <Check size={18} className="text-green-500 flex-shrink-0" />
                        <span className="capitalize">{key.replace(/_/g, ' ')}: {value}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => handleUpgrade(plan)}
                disabled={isCurrentPlan}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.name === 'Enterprise'
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isCurrentPlan ? 'Current Plan' : isFree ? 'Get Started' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {currentSubscription && currentPlan && (
        <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-lg font-semibold text-gray-900 capitalize">{currentSubscription.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Period Ends</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(currentSubscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Renewal</p>
              <p className="text-lg font-semibold text-gray-900">
                {currentSubscription.cancel_at_period_end ? 'Cancelled' : 'Auto-renew'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-600">
        <p>All plans include full ownership of your code and projects.</p>
        <p className="mt-1">Need help choosing? <button className="text-blue-500 hover:text-blue-600 font-medium">Contact us</button></p>
      </div>
    </div>
  );
}
