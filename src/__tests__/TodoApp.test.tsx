import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TodoApp from '../components/TodoApp';
import type { Todo } from '../types/todo';

// ─── localStorage mock ────────────────────────────────────────────────────────

const mockStore = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { mockStore.delete(key); }),
  clear: vi.fn(() => mockStore.clear()),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

beforeEach(() => {
  mockStore.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function addTodo(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByPlaceholderText(/add a new task/i);
  await user.type(input, text);
  await user.keyboard('{Enter}');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TodoApp', () => {
  describe('Empty state', () => {
    it('renders empty state when no todos exist', () => {
      render(<TodoApp />);
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });

    it('renders empty state for Active filter when all todos are complete', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Done task');
      await user.click(screen.getByLabelText('Mark as complete'));
      await user.click(screen.getByRole('button', { name: 'Active' }));
      expect(screen.getByText(/no active tasks/i)).toBeInTheDocument();
    });

    it('renders empty state for Completed filter when no todos are complete', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Pending task');
      await user.click(screen.getByRole('button', { name: 'Completed' }));
      expect(screen.getByText(/no completed tasks/i)).toBeInTheDocument();
    });
  });

  describe('Adding todos', () => {
    it('adds a new todo on Enter key press', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Buy groceries');
      expect(screen.getByText('Buy groceries')).toBeInTheDocument();
    });

    it('adds a new todo on Add button click', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      const input = screen.getByPlaceholderText(/add a new task/i);
      await user.type(input, 'Read a book');
      await user.click(screen.getByRole('button', { name: /^add$/i }));
      expect(screen.getByText('Read a book')).toBeInTheDocument();
    });

    it('does not add a whitespace-only todo', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      const input = screen.getByPlaceholderText(/add a new task/i);
      await user.type(input, '   ');
      await user.keyboard('{Enter}');
      expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
    });

    it('clears the input field after adding', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      const input = screen.getByPlaceholderText(/add a new task/i);
      await user.type(input, 'Clean house');
      await user.keyboard('{Enter}');
      expect(input).toHaveValue('');
    });
  });

  describe('Completing todos', () => {
    it('marks a todo as complete when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Walk the dog');
      await user.click(screen.getByLabelText('Mark as complete'));
      expect(screen.getByText('Walk the dog')).toHaveClass('line-through');
    });

    it('unmarks a completed todo when checkbox is clicked again', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Water plants');
      await user.click(screen.getByLabelText('Mark as complete'));
      await user.click(screen.getByLabelText('Mark as incomplete'));
      expect(screen.getByText('Water plants')).not.toHaveClass('line-through');
    });
  });

  describe('Deleting todos', () => {
    it('removes a todo after delete is clicked', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Clean the house');

      const item = screen.getByText('Clean the house').closest('[data-testid="todo-item"]')!;
      await user.click(within(item).getByLabelText('Delete todo'));

      await waitFor(
        () => expect(screen.queryByText('Clean the house')).not.toBeInTheDocument(),
        { timeout: 600 }
      );
    });
  });

  describe('Filter tabs', () => {
    it('All filter shows every todo', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Task A');
      await addTodo(user, 'Task B');
      // Complete Task B (most recently added, appears first)
      const checkboxes = screen.getAllByLabelText('Mark as complete');
      await user.click(checkboxes[0]);

      await user.click(screen.getByRole('button', { name: 'All' }));
      expect(screen.getByText('Task A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();
    });

    it('Active filter shows only incomplete todos', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Active task');
      await addTodo(user, 'Done task');
      // Done task was added last, appears first — complete it
      await user.click(screen.getAllByLabelText('Mark as complete')[0]);

      await user.click(screen.getByRole('button', { name: 'Active' }));
      expect(screen.getByText('Active task')).toBeInTheDocument();
      expect(screen.queryByText('Done task')).not.toBeInTheDocument();
    });

    it('Completed filter shows only completed todos', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Pending task');
      await addTodo(user, 'Finished task');
      // Finished task added last, appears first — complete it
      await user.click(screen.getAllByLabelText('Mark as complete')[0]);

      await user.click(screen.getByRole('button', { name: 'Completed' }));
      expect(screen.getByText('Finished task')).toBeInTheDocument();
      expect(screen.queryByText('Pending task')).not.toBeInTheDocument();
    });
  });

  describe('Counter', () => {
    it('displays correct completed count', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Task 1');
      await addTodo(user, 'Task 2');
      // Counter appears in both header and footer — assert at least one is present
      expect(screen.getAllByText(/0 of 2 completed/i).length).toBeGreaterThanOrEqual(1);
    });

    it('updates counter when a todo is completed', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Task A');
      await addTodo(user, 'Task B');
      await user.click(screen.getAllByLabelText('Mark as complete')[0]);
      expect(screen.getAllByText(/1 of 2 completed/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('localStorage persistence', () => {
    it('saves todos to localStorage when a todo is added', async () => {
      const user = userEvent.setup();
      render(<TodoApp />);
      await addTodo(user, 'Persistent task');
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'todo-app-todos',
          expect.stringContaining('Persistent task')
        );
      });
    });

    it('loads todos from localStorage on mount', async () => {
      const saved: Todo[] = [
        { id: '1', text: 'Saved todo', completed: false, createdAt: Date.now() },
      ];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(saved));
      render(<TodoApp />);
      await waitFor(() => {
        expect(screen.getByText('Saved todo')).toBeInTheDocument();
      });
    });

    it('restores completed state from localStorage', async () => {
      const saved: Todo[] = [
        { id: '1', text: 'Done item', completed: true, createdAt: Date.now() },
      ];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(saved));
      render(<TodoApp />);
      await waitFor(() => {
        expect(screen.getByText('Done item')).toHaveClass('line-through');
      });
    });
  });
});
