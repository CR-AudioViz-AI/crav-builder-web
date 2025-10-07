import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import WorkspaceList from './WorkspaceList';
import BaseView from './BaseView';
import ProjectList from './ProjectList';
import SubscriptionManager from './SubscriptionManager';
import UsageStats from './UsageStats';
import EnhancedAppBuilder from './EnhancedAppBuilder';
import PlatformDashboard from './PlatformDashboard';
import { LogOut, Plus, Code, Database, CreditCard, LayoutDashboard } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

interface Base {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  created_by: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedBase, setSelectedBase] = useState<Base | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'bases' | 'subscription'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
  }, [user]);

  const loadWorkspaces = async () => {
    if (!user) return;

    setLoading(true);
    const { data: memberships } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if (memberships && memberships.length > 0) {
      const workspaceIds = memberships.map(m => m.workspace_id);
      const { data } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds)
        .order('created_at', { ascending: false });

      if (data) {
        setWorkspaces(data);
        if (!selectedWorkspace && data.length > 0) {
          setSelectedWorkspace(data[0]);
        }
      }
    } else {
      await createDefaultWorkspace();
    }
    setLoading(false);
  };

  const createDefaultWorkspace = async () => {
    if (!user) return;

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name: 'My Workspace',
        owner_id: user.id,
      })
      .select()
      .single();

    if (!error && workspace) {
      await supabase.from('workspace_members').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

      setWorkspaces([workspace]);
      setSelectedWorkspace(workspace);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!user) return;

    const name = prompt('Enter workspace name:');
    if (!name) return;

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single();

    if (!error && workspace) {
      await supabase.from('workspace_members').insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'owner',
      });

      setWorkspaces([...workspaces, workspace]);
      setSelectedWorkspace(workspace);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (showBuilder) {
    return (
      <EnhancedAppBuilder
        projectId={selectedProjectId}
        onBack={() => {
          setShowBuilder(false);
          setSelectedProjectId(undefined);
        }}
      />
    );
  }

  if (selectedBase) {
    return (
      <BaseView
        base={selectedBase}
        onBack={() => setSelectedBase(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-xl">
                  📊
                </div>
                <h1 className="text-2xl font-bold text-gray-900">CRAudioVizAI Builder</h1>
              </div>

              <div className="h-8 w-px bg-gray-300"></div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedWorkspace?.id || ''}
                  onChange={(e) => {
                    const workspace = workspaces.find(w => w.id === e.target.value);
                    setSelectedWorkspace(workspace || null);
                  }}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {workspaces.map(workspace => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleCreateWorkspace}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                  title="Create workspace"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-1">
            <UsageStats />
          </div>
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
              <p className="text-blue-100">Build, manage, and own your projects. All code belongs to you.</p>
            </div>
          </div>
        </div>

        <div>
        <div className="mb-6">
          <div className="flex items-center gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutDashboard size={18} />
              Platform
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code size={18} />
              My Projects
            </button>
            <button
              onClick={() => setActiveTab('bases')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'bases'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database size={18} />
              Databases
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'subscription'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <CreditCard size={18} />
              Subscription
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <PlatformDashboard />
        )}

        {activeTab === 'projects' && selectedWorkspace && (
          <ProjectList
            workspaceId={selectedWorkspace.id}
            onOpenBuilder={(projectId) => {
              setSelectedProjectId(projectId);
              setShowBuilder(true);
            }}
          />
        )}

        {activeTab === 'bases' && selectedWorkspace && (
          <WorkspaceList
            workspace={selectedWorkspace}
            onSelectBase={setSelectedBase}
          />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionManager />
        )}
        </div>
      </main>
    </div>
  );
}
