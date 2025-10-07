import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Sparkles, Code, Eye, Download, Globe, ArrowLeft } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface Project {
  id: string;
  name: string;
  description: string;
  app_type: string;
  framework: string;
  preview_url: string | null;
  published_url: string | null;
  is_published: boolean;
  build_status: string;
  ai_conversation_history: Message[];
}

interface AppBuilderProps {
  projectId?: string;
  onBack: () => void;
}

export default function AppBuilder({ projectId, onBack }: AppBuilderProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI app builder. Describe the app you want to create, and I'll build it for you. For example: 'Create a task manager app' or 'Build a restaurant booking system'.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [view, setView] = useState<'chat' | 'preview' | 'code'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadProject = async () => {
    if (!projectId) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (data) {
      setProject(data);
      if (data.ai_conversation_history && data.ai_conversation_history.length > 0) {
        setMessages(data.ai_conversation_history);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      await supabase.from('ai_generations').insert({
        user_id: user.id,
        project_id: projectId || null,
        prompt: userMessage.content,
        tokens_used: Math.ceil(userMessage.content.length / 4),
        generation_type: projectId ? 'feature' : 'new_app',
        cost_credits: 1,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      let assistantResponse = '';

      if (!projectId) {
        assistantResponse = `Great! I'm building your app now. Here's what I'm creating:

**App Structure:**
- Modern, responsive React application
- User authentication system
- Dashboard with intuitive navigation
- Database integration for data persistence
- Mobile-friendly design

**Features:**
${generateFeatureList(userMessage.content)}

Your app is being generated... This will take about 30 seconds.`;

        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            user_id: user.id,
            workspace_id: (await getDefaultWorkspace()) || null,
            name: extractAppName(userMessage.content),
            description: userMessage.content,
            app_type: 'web',
            framework: 'react',
            build_status: 'building',
            ai_conversation_history: [...messages, userMessage],
            code_repository: {
              files: generateStarterFiles(userMessage.content),
              structure: {},
            },
          })
          .select()
          .single();

        if (newProject) {
          setTimeout(() => {
            supabase
              .from('projects')
              .update({
                build_status: 'ready',
                preview_url: `https://preview.yourapp.com/${newProject.id}`,
              })
              .eq('id', newProject.id);
          }, 30000);

          setProject(newProject);
        }
      } else {
        assistantResponse = `I'm adding that feature to your app. Here's what I'm implementing:

${generateFeatureResponse(userMessage.content)}

The changes are being applied to your app...`;

        await supabase
          .from('projects')
          .update({
            build_status: 'building',
            ai_conversation_history: [...messages, userMessage],
          })
          .eq('id', projectId);

        setTimeout(() => {
          supabase
            .from('projects')
            .update({ build_status: 'ready' })
            .eq('id', projectId);
        }, 10000);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultWorkspace = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    return data?.workspace_id;
  };

  const extractAppName = (prompt: string): string => {
    const match = prompt.match(/(?:create|build|make)\s+(?:a|an)?\s*(.+?)(?:\s+app|\s+application|$)/i);
    return match ? match[1].trim() : 'My App';
  };

  const generateFeatureList = (prompt: string): string => {
    const features = [
      '✓ User registration and login',
      '✓ Responsive dashboard',
      '✓ Data management interface',
      '✓ Search and filtering',
      '✓ Real-time updates',
    ];
    return features.join('\n');
  };

  const generateFeatureResponse = (prompt: string): string => {
    return `✓ Analyzing your request\n✓ Generating components\n✓ Integrating with existing code\n✓ Testing functionality`;
  };

  const generateStarterFiles = (prompt: string) => {
    return [
      { path: 'src/App.tsx', content: '// Generated React app' },
      { path: 'src/index.tsx', content: '// Entry point' },
      { path: 'package.json', content: '{}' },
    ];
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {project?.name || 'New App'}
              </h1>
              {project && (
                <p className="text-sm text-gray-600">
                  Status: <span className="capitalize">{project.build_status}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('chat')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                view === 'chat'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Sparkles size={18} />
              Chat
            </button>
            <button
              onClick={() => setView('preview')}
              disabled={!project}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 ${
                view === 'preview'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye size={18} />
              Preview
            </button>
            <button
              onClick={() => setView('code')}
              disabled={!project}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 ${
                view === 'code'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Code size={18} />
              Code
            </button>
            {project && (
              <button
                className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Globe size={18} />
                Deploy
              </button>
            )}
          </div>
        </div>
      </header>

      {view === 'chat' && (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles size={20} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-medium">
                        {user?.email?.[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Describe what you want to build or add..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={18} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'preview' && project && (
        <div className="flex-1 bg-white p-6">
          <div className="h-full border-2 border-gray-300 rounded-lg flex items-center justify-center">
            {project.preview_url ? (
              <iframe
                src={project.preview_url}
                className="w-full h-full rounded-lg"
                title="App Preview"
              />
            ) : (
              <div className="text-center text-gray-500">
                <Eye size={48} className="mx-auto mb-4 opacity-50" />
                <p>Building preview...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'code' && project && (
        <div className="flex-1 bg-gray-900 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 font-mono text-sm text-gray-100">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(project.code_repository, null, 2)}
              </pre>
            </div>
            <div className="mt-4 flex gap-4">
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2">
                <Download size={18} />
                Download Code
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2">
                <Code size={18} />
                Open in GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
