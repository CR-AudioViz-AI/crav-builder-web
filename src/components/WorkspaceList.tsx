import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Database } from 'lucide-react';

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

interface WorkspaceListProps {
  workspace: {
    id: string;
    name: string;
  };
  onSelectBase: (base: Base) => void;
}

export default function WorkspaceList({ workspace, onSelectBase }: WorkspaceListProps) {
  const { user } = useAuth();
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBases();
  }, [workspace.id]);

  const loadBases = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bases')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    if (data) {
      setBases(data);
    }
    setLoading(false);
  };

  const handleCreateBase = async () => {
    if (!user) return;

    const name = prompt('Enter base name:');
    if (!name) return;

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const icons = ['📊', '📈', '📋', '📝', '💼', '🎯', '🚀', '⚡', '🎨', '🔥'];

    const { data: base, error } = await supabase
      .from('bases')
      .insert({
        workspace_id: workspace.id,
        name,
        description: '',
        icon: icons[Math.floor(Math.random() * icons.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && base) {
      setBases([base, ...bases]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bases</h2>
        <button
          onClick={handleCreateBase}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Create Base
        </button>
      </div>

      {bases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <Database size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No bases yet</h3>
          <p className="text-gray-600 mb-6">Create your first base to get started</p>
          <button
            onClick={handleCreateBase}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Create Your First Base
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bases.map((base) => (
            <button
              key={base.id}
              onClick={() => onSelectBase(base)}
              className="group bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-gray-300 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: base.color + '20' }}
                >
                  {base.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors truncate">
                    {base.name}
                  </h3>
                  {base.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{base.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Created {new Date(base.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
