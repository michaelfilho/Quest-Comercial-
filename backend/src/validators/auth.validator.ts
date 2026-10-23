import { z } from 'zod';

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
    newPassword: z
      .string()
      .min(8, 'A senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A senha não pode exceder 128 caracteres.')
      .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
      .regex(/[0-9]/, 'A senha deve conter pelo menos um número.'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.').max(256),
    newPassword: z
      .string()
      .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
      .max(128, 'A nova senha não pode exceder 128 caracteres.')
      .regex(/[A-Za-z]/, 'A nova senha deve conter pelo menos uma letra.')
      .regex(/[0-9]/, 'A nova senha deve conter pelo menos um número.'),
  })
  .strict();
