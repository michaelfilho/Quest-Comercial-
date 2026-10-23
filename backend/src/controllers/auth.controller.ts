import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { authService } from '../services/auth.service.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);
      const result = await authService.login({
        email: parsed.email,
        password: parsed.password,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.cookie(env.SESSION_COOKIE_NAME, result.sessionToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: result.expiresAt,
        path: '/',
      });

      res.status(200).json({
        user: result.user,
        expiresAt: result.expiresAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.sessionId, req.user?.id, req.ip);
      res.clearCookie(env.SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response) {
    res.status(200).json({ user: req.user });
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = forgotPasswordSchema.parse(req.body);
      const result = await authService.requestPasswordResetOrActivation(parsed.email, req.ip);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPasswordWithToken(
        parsed.token,
        parsed.newPassword,
        req.ip
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(
        req.user!.id,
        parsed.currentPassword,
        parsed.newPassword,
        req.ip
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async initialAccounts(_req: Request, res: Response, next: NextFunction) {
    try {
      const accounts = await authService.listInitialAccountsStatus();
      res.status(200).json({ accounts });
    } catch (err) {
      next(err);
    }
  },
};

