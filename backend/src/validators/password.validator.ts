import { z } from 'zod';

export const passwordSchema = z.string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .max(128, 'A senha não pode exceder 128 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número.');
