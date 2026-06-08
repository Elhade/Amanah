'use client';

import { User, Mail, Phone } from 'lucide-react';
import { SectionHeader } from './shared';

interface Props {
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onPhoneChange: (val: string) => void;
}

export function PonctuelInfoForm({
  donorName, donorEmail, donorPhone,
  onNameChange, onEmailChange, onPhoneChange,
}: Props) {
  return (
    <div>
      <SectionHeader icon={<User className="w-4 h-4" />} label="Vos informations" />
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Votre nom *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="text"
                value={donorName}
                onChange={e => onNameChange(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="Nom complet"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Adresse e-mail *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
              <input
                type="email"
                value={donorEmail}
                onChange={e => onEmailChange(e.target.value)}
                className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
                placeholder="exemple@email.com"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Le reçu vous sera envoyé par e-mail.</p>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Téléphone (optionnel)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
            <input
              type="tel"
              value={donorPhone}
              onChange={e => onPhoneChange(e.target.value)}
              className="w-full pl-9 pr-3 py-3 border-2 border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-400 transition-all text-sm"
              placeholder="+33 6 12 34 56 78"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
