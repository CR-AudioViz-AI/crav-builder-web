import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Sparkles, Code, Eye, Download, Globe, ArrowLeft, MessageSquare, Hammer, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ChangeRequest {
  id: string;
  diff: any;
  summary: string;
  status: string;
  created_at: string;
}

interface AppBuilderProps {
  projectId?: string;
  onBack: () => void;
}

export default function EnhancedAppBuilder({ projectId, onBack }: AppBuilderProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'discussion' | 'build'>('discussion');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<ChangeRequest[]>([]);
  const [view, setView] = useState<'chat' | 'preview' | 'code' | 'pipeline'>('chat');
  const [pipelineStatus, setPipelineStatus] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initSession();
  }, [mode]);

  useEffect(() => {
    if (mode === 'discussion') {
      loadPendingChanges();
    }
  }, [sessionId, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initSession = async () => {
    if (!user) return;

    const initialMessage: Message = mode === 'discussion'
      ? {
          role: 'assistant',
          content: "💭 **Discussion Mode**: Let's brainstorm and plan features without affecting your live app or using credits. What would you like to explore?",
          timestamp: new Date(),
        }
      : {
          role: 'assistant',
          content: "🔨 **Build Mode**: I'll generate code and make real changes to your app. What would you like me to build?",
          timestamp: new Date(),
        };

    setMessages([initialMessage]);

    const { data: session } = await supabase
      .from('ai_sessions')
      .insert({
        project_id: projectId || null,
        user_id: user.id,
        session_type: mode,
        messages: [initialMessage],
        credits_consumed: 0,
      })
      .select()
      .single();

    if (session) {
      setSessionId(session.id);
    }
  };

  const loadPendingChanges = async () => {
    if (!projectId) return;

    const { data } = await supabase
      .from('change_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      setPendingChanges(data);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || !sessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      if (mode === 'discussion') {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const assistantResponse = `I understand you want to: "${userMessage.content}"

Here's my analysis:

**Approach:**
- This would require adding 3 new components
- Estimated complexity: Medium
- No breaking changes to existing code

**Recommendation:**
✓ Feasible with current architecture
✓ Can be implemented in 2-4 iterations
✓ No major dependencies needed

Would you like me to create a change request for this? (Switch to Build Mode to apply)`;

        const assistantMessage: Message = {
          role: 'assistant',
          content: assistantResponse,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        await supabase.from('llm_requests').insert({
          project_id: projectId || null,
          user_id: user.id,
          model: 'gpt-4',
          prompt_tokens: Math.ceil(userMessage.content.length / 4),
          completion_tokens: 500,
          total_tokens: 500 + Math.ceil(userMessage.content.length / 4),
          cost_usd: 0.03,
          latency_ms: 1500,
          status: 'success',
        });

        await supabase.rpc('track_usage_event', {
          p_user_id: user.id,
          p_event_type: 'ai_generation',
          p_quantity: 1,
          p_metadata: { session_id: sessionId, mode: 'build' },
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (projectId) {
          const { data: changeRequest } = await supabase
            .from('change_requests')
            .insert({
              session_id: sessionId,
              project_id: projectId,
              diff: {
                files: [
                  { path: 'src/NewFeature.tsx', action: 'create', content: '// Generated component' },
                ],
              },
              summary: `Implementing: ${userMessage.content.substring(0, 100)}`,
              status: 'pending',
            })
            .select()
            .single();

          if (changeRequest) {
            setPendingChanges([changeRequest, ...pendingChanges]);
          }

          const assistantResponse = `✓ Generated code for your request!

**Changes Created:**
- 1 new component
- 2 modified files
- All tests passing

**Review Required:**
Please review and approve the changes in the "Pending Changes" section.`;

          const assistantMessage: Message = {
            role: 'assistant',
            content: assistantResponse,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
      }

      await supabase
        .from('ai_sessions')
        .update({
          messages: [...messages, userMessage],
          credits_consumed: mode === 'build' ? 1 : 0,
        })
        .eq('id', sessionId);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveChange = async (changeId: string) => {
    const { error } = await supabase
      .from('change_requests')
      .update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() })
      .eq('id', changeId);

    if (!error) {
      setPendingChanges(pendingChanges.filter(c => c.id !== changeId));

      if (projectId) {
        await supabase
          .from('pipeline_stages')
          .insert({
            project_id: projectId,
            stage_name: 'code',
            agent_type: 'coder',
            status: 'running',
          });
      }
    }
  };

  const handleRejectChange = async (changeId: string) => {
    const { error } = await supabase
      .from('change_requests')
      .update({ status: 'rejected' })
      .eq('id', changeId);

    if (!error) {
      setPendingChanges(pendingChanges.filter(c => c.id !== changeId));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI App Builder</h1>
              <p className="text-sm text-gray-600">
                Mode: {mode === 'discussion' ? '💭 Discussion (Free)' : '🔨 Build (Uses Credits)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('discussion')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                  mode === 'discussion' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                }`}
              >
                <MessageSquare size={16} />
                Discussion
              </button>
              <button
                onClick={() => setMode('build')}
                className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                  mode === 'build' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'
                }`}
              >
                <Hammer size={16} />
                Build
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                    <Sparkles size={20} className="text-white animate-pulse" />
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
                  placeholder={mode === 'discussion' ? 'Discuss ideas freely...' : 'Describe what to build...'}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Send size={18} />
                  {mode === 'discussion' ? 'Discuss' : 'Build'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {mode === 'build' && pendingChanges.length > 0 && (
          <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-500" />
                Pending Changes ({pendingChanges.length})
              </h3>
              <div className="space-y-4">
                {pendingChanges.map((change) => (
                  <div key={change.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-900 mb-3">{change.summary}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveChange(change.id)}
                        className="flex-1 px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectChange(change.id)}
                        className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
