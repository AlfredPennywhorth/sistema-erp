import React from 'react';
import { Users, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const EmptyState = ({ onInvite }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl"
    >
      <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-brand-primary/5">
        <Users className="text-brand-primary" size={40} />
      </div>
      
      <h3 className="text-2xl font-bold text-white mb-2">Sua equipe ainda esta vazia</h3>
      <p className="text-slate-400 max-w-md mb-8">
        Comece convidando os membros da sua organizacao para colaborar. Voce pode definir cargos como Admin, Gestor ou Operador.
      </p>
      
      <button
        onClick={onInvite}
        className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/80 text-white px-8 py-4 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-primary/20"
      >
        <Plus size={20} />
        Convidar Meu Primeiro Membro
      </button>
    </motion.div>
  );
};

export default EmptyState;
