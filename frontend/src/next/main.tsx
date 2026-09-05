import { createRoot } from 'react-dom/client';
import App from './App';
import '../styles/index.css';
import './styles.css';

document.documentElement.classList.add('next-ia');

createRoot(document.getElementById('root')!).render(<App />);
