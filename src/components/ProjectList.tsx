import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Code, Archive, ExternalLink, Clock } from 'lucide-react';

interface Project {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  description: string;
  code_repository: any;
  deployment_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ProjectListProps {
  workspaceId: string;
  onOpenBuilder: (projectId?: string) => void;
}

export default function ProjectList({ workspaceId, onOpenBuilder }: ProjectListProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreateMore, setCanCreateMore] = useState(true);

  useEffect(() => {
    loadProjects();
    checkLimits();
  }, [workspaceId]);

  const loadProjects = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setProjects(data);
    }
    setLoading(false);
  };

  const checkLimits = async () => {
    if (!user) return;

    const { data } = await supabase.rpc('check_user_subscription_limit', {
      p_user_id: user.id,
      p_limit_type: 'projects'
    });

    setCanCreateMore(data === true);
  };

  const handleCreateProject = async () => {
    if (!user) return;

    if (!canCreateMore) {
      alert('You have reached your project limit. Please upgrade your plan to create more projects.');
      return;
    }

    onOpenBuilder();
  };

  const handleArchiveProject = async (projectId: string) => {
    if (!confirm('Archive this project? You can restore it later.')) return;

    const { error } = await supabase
      .from('projects')
      .update({ status: 'archived' })
      .eq('id', projectId);

    if (!error) {
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, status: 'archived' } : p
      ));
      await checkLimits();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      archived: 'bg-gray-100 text-gray-700',
      deployed: 'bg-blue-100 text-blue-700',
    };
    return styles[status as keyof typeof styles] || styles.active;
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Projects</h2>
          <p className="text-sm text-gray-600 mt-1">
            Build and own your code. All projects and code belong to you.
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          disabled={!canCreateMore}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!canCreateMore ? 'Upgrade to create more projects' : ''}
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {!canCreateMore && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Project limit reached.</strong> Upgrade your plan to create more projects and unlock additional features.
          </p>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <Code size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">Create your first project to start building</p>
          <button
            onClick={handleCreateProject}
            disabled={!canCreateMore}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Plus size={18} />
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onOpenBuilder(project.id)}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Code size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Clock size={14} />
                <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm">
                  <Code size={14} />
                  Open
                </span>
                {project.deployment_url && (
                  <a
                    href={project.deployment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Live
                  </a>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
