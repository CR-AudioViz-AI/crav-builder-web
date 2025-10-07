import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, CreditCard as Edit2, Check, X } from 'lucide-react';

interface Table {
  id: string;
  base_id: string;
  name: string;
  description: string;
  order_index: number;
  created_at: string;
}

interface Field {
  id: string;
  table_id: string;
  name: string;
  type: string;
  options: any;
  order_index: number;
  required: boolean;
  created_at: string;
}

interface Record {
  id: string;
  table_id: string;
  data: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface TableViewProps {
  table: Table;
  baseColor: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
];

export default function TableView({ table, baseColor }: TableViewProps) {
  const { user } = useAuth();
  const [fields, setFields] = useState<Field[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadData();
  }, [table.id]);

  const loadData = async () => {
    setLoading(true);

    const [fieldsResult, recordsResult] = await Promise.all([
      supabase
        .from('fields')
        .select('*')
        .eq('table_id', table.id)
        .order('order_index', { ascending: true }),
      supabase
        .from('records')
        .select('*')
        .eq('table_id', table.id)
        .order('created_at', { ascending: false }),
    ]);

    if (fieldsResult.data) setFields(fieldsResult.data);
    if (recordsResult.data) setRecords(recordsResult.data);

    setLoading(false);
  };

  const handleAddField = async () => {
    const name = prompt('Enter field name:');
    if (!name) return;

    const type = prompt('Enter field type (text, number, date, checkbox, email, url, phone):') || 'text';

    const { data: field, error } = await supabase
      .from('fields')
      .insert({
        table_id: table.id,
        name,
        type,
        order_index: fields.length,
        required: false,
      })
      .select()
      .single();

    if (!error && field) {
      setFields([...fields, field]);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    const { error } = await supabase
      .from('fields')
      .delete()
      .eq('id', fieldId);

    if (!error) {
      setFields(fields.filter(f => f.id !== fieldId));
    }
  };

  const handleAddRecord = async () => {
    if (!user) return;

    const initialData: any = {};
    fields.forEach(field => {
      if (field.type === 'checkbox') {
        initialData[field.id] = false;
      } else if (field.type === 'number') {
        initialData[field.id] = 0;
      } else {
        initialData[field.id] = '';
      }
    });

    const { data: record, error } = await supabase
      .from('records')
      .insert({
        table_id: table.id,
        data: initialData,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && record) {
      setRecords([record, ...records]);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', recordId);

    if (!error) {
      setRecords(records.filter(r => r.id !== recordId));
    }
  };

  const handleStartEdit = (recordId: string, fieldId: string, currentValue: any) => {
    setEditingCell({ recordId, fieldId });
    setEditValue(currentValue?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;

    const record = records.find(r => r.id === editingCell.recordId);
    if (!record) return;

    const field = fields.find(f => f.id === editingCell.fieldId);
    if (!field) return;

    let value: any = editValue;
    if (field.type === 'number') {
      value = parseFloat(editValue) || 0;
    } else if (field.type === 'checkbox') {
      value = editValue === 'true';
    }

    const newData = { ...record.data, [editingCell.fieldId]: value };

    const { error } = await supabase
      .from('records')
      .update({ data: newData })
      .eq('id', editingCell.recordId);

    if (!error) {
      setRecords(records.map(r =>
        r.id === editingCell.recordId ? { ...r, data: newData } : r
      ));
    }

    setEditingCell(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const renderCell = (record: Record, field: Field) => {
    const value = record.data?.[field.id];
    const isEditing = editingCell?.recordId === record.id && editingCell?.fieldId === field.id;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          {field.type === 'checkbox' ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          )}
          <button
            onClick={handleSaveEdit}
            className="p-1 hover:bg-green-100 rounded text-green-600"
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleStartEdit(record.id, field.id, value)}
        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded group"
      >
        {field.type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={value === true}
            readOnly
            className="pointer-events-none"
          />
        ) : (
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || 'Empty'}
          </span>
        )}
        <Edit2 size={12} className="inline ml-2 opacity-0 group-hover:opacity-50 transition-opacity" />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200" style={{ backgroundColor: baseColor + '10' }}>
                  <th className="w-12 px-4 py-3"></th>
                  {fields.map((field) => (
                    <th key={field.id} className="px-4 py-3 text-left min-w-[200px]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-gray-900">{field.name}</div>
                          <div className="text-xs text-gray-500 font-normal">
                            {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-1 hover:bg-red-100 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 w-32">
                    <button
                      onClick={handleAddField}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 font-normal"
                    >
                      <Plus size={14} />
                      Add Field
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, idx) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                    <td className="px-4 py-2 text-center text-sm text-gray-500">
                      {idx + 1}
                    </td>
                    {fields.map((field) => (
                      <td key={field.id} className="px-1 py-1">
                        {renderCell(record, field)}
                      </td>
                    ))}
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-2 hover:bg-red-100 hover:text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-200 p-4">
            <button
              onClick={handleAddRecord}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
