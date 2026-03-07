'use client';

import { useState, useEffect, useRef } from 'react';
import { Todo, FilterType } from '@/types/todo';

const STORAGE_KEY = 'todo-app-todos';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadTodosFromStorage(): Todo[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Todo[]) : [];
  } catch {
    return [];
  }
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

interface TodoItemProps {
  todo: Todo;
  isDeleting: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TodoItem({ todo, isDeleting, onToggle, onDelete }: TodoItemProps) {
  return (
    <div
      data-testid="todo-item"
      className={`flex items-center gap-3 px-5 py-4 group border-b border-gray-50 last:border-0 transition-all duration-300 ${
        isDeleting ? 'opacity-0 translate-x-4' : 'animate-slide-down'
      }`}
    >
      {/* Custom checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-1 ${
          todo.completed
            ? 'bg-violet-500 border-violet-500 scale-110'
            : 'border-gray-300 hover:border-violet-400 hover:scale-110'
        }`}
      >
        {todo.completed && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Todo text */}
      <span
        className={`flex-1 text-sm leading-relaxed transition-all duration-300 ${
          todo.completed
            ? 'line-through text-gray-400 opacity-50'
            : 'text-gray-700'
        }`}
      >
        {todo.text}
      </span>

      {/* Delete button */}
      <button
        onClick={() => onDelete(todo.id)}
        aria-label="Delete todo"
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTodos(loadTodosFromStorage());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }
  }, [todos, mounted]);

  const addTodo = () => {
    const text = inputValue.trim();
    if (!text) return;
    setTodos(prev => [
      { id: generateId(), text, completed: false, createdAt: Date.now() },
      ...prev,
    ]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const toggleTodo = (id: string) => {
    setTodos(prev =>
      prev.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
    );
  };

  const deleteTodo = (id: string) => {
    setDeletingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setTodos(prev => prev.filter(todo => todo.id !== id));
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  };

  const clearCompleted = () => {
    setTodos(prev => prev.filter(t => !t.completed));
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-100 flex items-start justify-center p-4 pt-12 sm:pt-20">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Gradient header */}
          <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 px-6 pt-8 pb-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">My Tasks</h1>
                <p className="text-violet-200 text-sm mt-0.5">
                  {totalCount === 0
                    ? 'Nothing here yet — add a task!'
                    : `${completedCount} of ${totalCount} completed`}
                </p>
              </div>
              {totalCount > 0 && (
                <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-2 text-center min-w-[64px]">
                  <span className="text-white text-xl font-bold leading-none">{remainingCount}</span>
                  <p className="text-violet-200 text-[10px] mt-0.5 uppercase tracking-wide">left</p>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="mt-3 mb-5 bg-white/20 rounded-full h-1.5">
                <div
                  className="bg-white rounded-full h-1.5 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* Input */}
            <div className={`flex gap-2 ${totalCount === 0 ? 'mt-4' : ''}`}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="Add a new task..."
                className="flex-1 bg-white/15 text-white placeholder:text-violet-300 border border-white/25 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white/25 focus:border-white/50 transition-all duration-200 min-w-0"
              />
              <button
                onClick={addTodo}
                disabled={!inputValue.trim()}
                className="flex-shrink-0 bg-white text-violet-600 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-violet-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                Add
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-gray-100">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`flex-1 py-3 text-sm font-medium transition-all duration-200 relative focus:outline-none ${
                  filter === key ? 'text-violet-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
                {filter === key && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-violet-500 rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Todo list */}
          <div className="max-h-[380px] overflow-y-auto overscroll-contain">
            {filteredTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  {filter === 'all'
                    ? 'No tasks yet — add one above!'
                    : filter === 'active'
                    ? 'No active tasks.'
                    : 'No completed tasks.'}
                </p>
              </div>
            ) : (
              filteredTodos.map(todo => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  isDeleting={deletingIds.has(todo.id)}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {todos.length > 0 && (
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {completedCount} of {totalCount} completed
              </span>
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-xs text-gray-400 hover:text-red-400 transition-colors duration-150 focus:outline-none"
                >
                  Clear completed
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
