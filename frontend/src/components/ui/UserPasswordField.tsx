import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const UserPasswordField: React.FC<{
  id: string; value: string; onChange: (value: string) => void; required?: boolean;
}> = ({ id, value, onChange, required = false }) => {
  const [visible, setVisible] = useState(false);
  return <div>
    <label htmlFor={id} className="block text-xs font-semibold mb-1">{required ? 'Senha de acesso *' : 'Nova senha (opcional)'}</label>
    <div className="relative">
      <input id={id} type={visible ? 'text' : 'password'} required={required} minLength={8} maxLength={128}
        pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" autoComplete="new-password" value={value}
        onChange={(e) => onChange(e.target.value)} className="w-full pl-3 pr-11 py-2 text-sm rounded-xl border border-zinc-300"
        aria-describedby={`${id}-hint`} />
      <button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
    <p id={`${id}-hint`} className="mt-1 text-[11px] text-zinc-500">Mínimo de 8 caracteres, com letras e números.{!required && ' Deixe em branco para manter a senha atual.'}</p>
  </div>;
};
