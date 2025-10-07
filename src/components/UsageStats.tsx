import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database, FileCode, HardDrive, TrendingUp } from 'lucide-react';

interface UsageData {
  projects: { current: number; limit: number };
  bases: { current: number; limit: number };
  records: { current: number; limit: number };
  storage: { current: number; limit: number };
}

interface SubscriptionPlan {
  max_projects: number;
  max_bases: number;
  max_records_per_base: number;
  max_storage_mb: number;
}

export default function UsageStats() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsageData();
  }, [user]);

  const loadUsageData = async () => {
    if (!user) return;

    setLoading(true);

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription) {
      setLoading(false);
      return;
    }

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', subscription.plan_id)
      .maybeSingle();

    if (!plan) {
      setLoading(false);
      return;
    }

    const [projectsResult, basesResult, recordsResult] = await Promise.all([
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'archived'),
      supabase
        .from('bases')
        .select('id, workspace_id')
        .then(async (result) => {
          if (!result.data) return { count: 0 };
          const workspaceIds = result.data.map(b => b.workspace_id);
          const { data: workspaces } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .in('id', workspaceIds);
          return { count: workspaces?.length || 0 };
        }),
      supabase
        .from('records')
        .select('id', { count: 'exact', head: true }),
    ]);

    setUsage({
      projects: {
        current: projectsResult.count || 0,
        limit: plan.max_projects,
      },
      bases: {
        current: basesResult.count || 0,
        limit: plan.max_bases,
      },
      records: {
        current: recordsResult.count || 0,
        limit: plan.max_records_per_base,
      },
      storage: {
        current: 0,
        limit: plan.max_storage_mb,
      },
    });

    setLoading(false);
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0;
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString();
  };

  if (loading || !usage) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp size={20} />
        Your Usage
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <FileCode size={16} />
              Projects
            </div>
            <span className="text-sm text-gray-600">
              {usage.projects.current} / {formatLimit(usage.projects.limit)}
            </span>
          </div>
          {usage.projects.limit !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.projects.current, usage.projects.limit)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.projects.current, usage.projects.limit)}%`,
                }}
              ></div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Database size={16} />
              Bases
            </div>
            <span className="text-sm text-gray-600">
              {usage.bases.current} / {formatLimit(usage.bases.limit)}
            </span>
          </div>
          {usage.bases.limit !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.bases.current, usage.bases.limit)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.bases.current, usage.bases.limit)}%`,
                }}
              ></div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <HardDrive size={16} />
              Storage
            </div>
            <span className="text-sm text-gray-600">
              {usage.storage.current}MB / {formatLimit(usage.storage.limit)}MB
            </span>
          </div>
          {usage.storage.limit !== -1 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getUsageColor(
                  getUsagePercentage(usage.storage.current, usage.storage.limit)
                )}`}
                style={{
                  width: `${getUsagePercentage(usage.storage.current, usage.storage.limit)}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Usage resets monthly. Upgrade your plan for higher limits.
        </p>
      </div>
    </div>
  );
}
