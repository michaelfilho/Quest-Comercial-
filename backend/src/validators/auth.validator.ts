import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um endereço de e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Informe um endereço de e-mail válido.'),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16, 'Token de ativação/redefinição inválido.'),
  newPassword: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número.'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres.')
    .regex(/[A-Za-z]/, 'A nova senha deve conter pelo menos uma letra.')
    .regex(/[0-9]/, 'A nova senha deve conter pelo menos um número.'),
});

