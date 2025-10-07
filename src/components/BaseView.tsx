import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import TableView from './TableView';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

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

interface Table {
  id: string;
  base_id: string;
  name: string;
  description: string;
  order_index: number;
  created_at: string;
}

interface BaseViewProps {
  base: Base;
  onBack: () => void;
}

export default function BaseView({ base, onBack }: BaseViewProps) {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTables();
  }, [base.id]);

  const loadTables = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('base_id', base.id)
      .order('order_index', { ascending: true });

    if (data) {
      setTables(data);
      if (data.length > 0 && !selectedTable) {
        setSelectedTable(data[0]);
      }
    }
    setLoading(false);
  };

  const handleCreateTable = async () => {
    if (!user) return;

    const name = prompt('Enter table name:');
    if (!name) return;

    const { data: table, error } = await supabase
      .from('tables')
      .insert({
        base_id: base.id,
        name,
        description: '',
        order_index: tables.length,
      })
      .select()
      .single();

    if (!error && table) {
      const newTables = [...tables, table];
      setTables(newTables);
      setSelectedTable(table);

      await supabase.from('fields').insert({
        table_id: table.id,
        name: 'Name',
        type: 'text',
        order_index: 0,
        required: true,
      });
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? All records will be lost.')) {
      return;
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', tableId);

    if (!error) {
      const newTables = tables.filter(t => t.id !== tableId);
      setTables(newTables);
      if (selectedTable?.id === tableId) {
        setSelectedTable(newTables[0] || null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: base.color + '20' }}
              >
                {base.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{base.name}</h1>
                {base.description && (
                  <p className="text-sm text-gray-600">{base.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {tables.map((table) => (
              <div key={table.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedTable(table)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedTable?.id === table.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {table.name}
                </button>
                {tables.length > 1 && (
                  <button
                    onClick={() => handleDeleteTable(table.id)}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-gray-400"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={handleCreateTable}
              className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              Add Table
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {selectedTable ? (
          <TableView table={selectedTable} baseColor={base.color} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-600 mb-4">No tables yet</p>
              <button
                onClick={handleCreateTable}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                Create Table
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
