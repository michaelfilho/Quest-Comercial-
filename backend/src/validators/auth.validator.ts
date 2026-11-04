import { z } from 'zod';
import { passwordSchema } from './password.validator.js';

// 🔒 SEGURANÇA [VULN-5 / Lei 2 & Lei 3]: Schemas estritos (.strict()) com limites máximos de tamanho (.max())
export const loginSchema = z
  .object({
    email: z.string().trim().max(254).email('Informe um endereço de e-mail válido.'),
    password: z.string().min(1, 'Informe sua senha.').max(256),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().max(254).email('Informe um endereço de e-mail válido.'),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(16, 'Token de ativação/redefinição inválido.').max(256),
    newPassword: passwordSchema,
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.').max(256),
    newPassword: passwordSchema,
  })
  .strict();
