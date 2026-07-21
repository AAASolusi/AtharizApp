import { Todo } from '../types/todo';

interface TodoStatsProps {
  todos: Todo[];
}

export default function TodoStats({ todos }: TodoStatsProps) {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  const active = total - completed;
  const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-blue-600">{total}</p>
        <p className="text-gray-600 text-sm">Total Tasks</p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-green-600">{completed}</p>
        <p className="text-gray-600 text-sm">Completed</p>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg text-center">
        <p className="text-2xl font-bold text-orange-600">{active}</p>
        <p className="text-gray-600 text-sm">Active</p>
      </div>
    </div>
  );
}
