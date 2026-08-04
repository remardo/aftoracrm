import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 p-6 text-center">
      <p className="text-7xl font-extrabold text-amber-600">404</p>
      <p className="text-xl font-semibold text-stone-800 mt-2">Страница не найдена</p>
      <p className="text-stone-500 mt-1">Возможно, страница была перемещена или удалена.</p>
      <Link to="/"><Button className="mt-6"><Home size={16} /> На главную</Button></Link>
    </div>
  );
}
