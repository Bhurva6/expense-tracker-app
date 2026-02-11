'use client';
import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Card, Input, Button } from "./ui/shadcn";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface ProjectExpenseItem {
  description: string;
  amount: string;
  files: File[];
}

export default function ProjectExpenseForm({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expenses, setExpenses] = useState<ProjectExpenseItem[]>([{ description: '', amount: '', files: [] }]);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const projectDoc = await getDocs(
        query(collection(db, 'projects'), where('__name__', '==', projectId))
      );
      if (!projectDoc.empty) {
        const data = projectDoc.docs[0].data();
        setProject({ id: projectId, ...data } as ProjectData);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setExpenses([...expenses, { description: '', amount: '', files: [] }]);
  };

  const handleRemoveExpense = (idx: number) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((_, i) => i !== idx));
    }
  };

  const handleExpenseChange = (idx: number, field: string, value: any) => {
    const updated = [...expenses];
    updated[idx] = { ...updated[idx], [field]: value };
    setExpenses(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validExpenses = expenses.filter(exp => exp.amount && parseFloat(exp.amount) > 0);
    if (validExpenses.length === 0) {
      alert('Please add at least one expense');
      return;
    }

    try {
      setSubmitting(true);

      const total = validExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

      const expenseData = {
        projectId,
        projectName: project?.name,
        expenses: validExpenses,
        total,
        status: 'Pending',
        user: {
          uid: user?.uid,
          name: user?.displayName,
          email: user?.email,
        },
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'projectExpenses'), expenseData);
      alert('Expense submitted successfully!');
      setExpenses([{ description: '', amount: '', files: [] }]);
    } catch (err: any) {
      alert('Error submitting expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading project...</div>;
  if (!project) return <div className="p-4">Project not found</div>;

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 rounded"
        style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '2px solid var(--muted)' }}
      >
        ← Back to Dashboard
      </button>

      <Card className="p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
          {project.name}
        </h2>
        <p className="text-gray-600 mb-4">{project.description}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Project Duration</p>
            <p className="font-semibold">
              {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>Submit Project Expense</h3>

        {expenses.map((expense, idx) => (
          <Card key={idx} className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  type="text"
                  value={expense.description}
                  onChange={(e) => handleExpenseChange(idx, 'description', e.target.value)}
                  placeholder="What is this expense for?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <Input
                  type="number"
                  value={expense.amount}
                  onChange={(e) => handleExpenseChange(idx, 'amount', e.target.value)}
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {expenses.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveExpense(idx)}
                className="text-sm px-3 py-1 rounded text-red-600 border border-red-600 hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </Card>
        ))}

        <button
          type="button"
          onClick={handleAddExpense}
          className="text-sm px-4 py-2 rounded"
          style={{ background: '#10b981', color: 'white' }}
        >
          + Add Another Expense
        </button>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            onClick={onBack}
            style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '2px solid var(--muted)', flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            style={{ background: 'var(--primary)', color: 'var(--surface)', flex: 1 }}
          >
            {submitting ? 'Submitting...' : 'Submit Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}
