
import React from 'react';
import { Page } from '../types';
import { Leaf, Store, MessageSquare, Phone, BookOpen, Shield } from 'lucide-react';

interface NavbarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage }) => {
  const navItems = [
    { id: 'home', label: 'Accueil', icon: Leaf },
    { id: 'catalog', label: 'Boutique', icon: Store },
    { id: 'about', label: 'Histoire', icon: BookOpen },
    { id: 'whatsapp_advice', label: 'Conseil', icon: MessageSquare },
    { id: 'contact', label: 'Contact', icon: Phone }
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 liquid-glass rounded-full flex gap-4 md:gap-8 items-center max-w-[95vw] overflow-x-auto no-scrollbar">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'whatsapp_advice') {
                window.open('https://wa.me/33782931468?text=Bonjour, je souhaiterais un conseil', '_blank');
              } else {
                setCurrentPage(item.id as Page);
              }
            }}
            className={`flex flex-col items-center transition-all duration-300 group flex-shrink-0 ${
              isActive ? 'text-lime-400 scale-110' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon size={20} className={`mb-1 transition-transform group-hover:-translate-y-1 ${isActive ? 'drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]' : ''}`} />
            <span className="text-[10px] uppercase tracking-widest font-bold whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navbar;
