import { controller, post } from 'koa-dec-router';
import bcrypt from 'bcrypt';
import moment from 'moment';
import isEmpty from 'lodash/isEmpty';
import * as HttpStatus from 'http-status-codes';

import { UsersRepo } from '../repository/Users';
import * as validation from '../lib/validation';
import { generateJwt, decodeJwt } from '../lib/auth';
import { getRoleAcl } from '../lib/acl'
import { env } from '../lib/env'

import { log, LOG_LOGIN_FAILED, LOG_LOGIN_SUCCESS, LOG_RECOVER_PASSWORD, LOG_CONFIRM_EMAIL, LOG_REFRESH_FAILED } from '../lib/logger';

export default @controller("/auth")
class AuthController {
  @post("/register")
  async register(ctx) {
    // validate the request body first
    const req = ctx.request;
    const { error } = validation.validateUser(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return
    }

    let user = await UsersRepo.save(req.body);

    if (typeof user === 'undefined') {
      ctx.badRequest("Не удалоь сохранить пользователя.");
      return;
    }
    ctx.status = HttpStatus.CREATED;
    ctx.body = {
      id: user.id,
    };
  }

  @post("/login")
  async login(ctx) {
    console.log('/login');
    
    const { email, password } = ctx.request.body;

    try {
      let data;
      let account;
      let passed;

      const { error } = validation.validateCreds(ctx.request.body);

      if (error) {
        return ctx.badRequest(error.details[0].message);
      }

      data = { email };
      account = await UsersRepo.loginByEmail(data.email);

      if (!account) {
        log(LOG_LOGIN_FAILED, { email: data.email });
        return ctx.unauthorized({ message: `Пользователь с email ${data.email} не найден` })
      }

      if (!account.authData.confirmed) {
        log(LOG_LOGIN_FAILED, { email: data.email });
        return ctx.unauthorized({ message: `Аккаунт не подтвержден.` })
      }

      passed = await bcrypt.compare(password, account.authData.password);
      if (!passed) {
        log(LOG_LOGIN_FAILED, { email: data.email });
        return ctx.unauthorized({ message: `Неправильный email или пароль.` })
      }

      log(LOG_LOGIN_SUCCESS, { email: data.email });

      const user = account.get({ plain: true });
      user.permissions = getRoleAcl(account.authData.role).allow;

      delete user.authData.password;

      const accessToken = await generateJwt(account);
      // TODO: remove cookies for access_token
      ctx.cookies.set('access_token', accessToken, {
        httpOnly: true,
        // sameSite: true,
        expires: new Date(moment().add(1, 'hour').toISOString()),
      });

      let refreshToken = await generateJwt(account, 'refresh');
      ctx.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        // sameSite: true,
        path: `${env.API_PREFIX}/auth`,
        expires: new Date(moment().add(30, 'days').toISOString()),
      });

      await UsersRepo.updateAuthData(user.id, {
        refreshToken,
      });

      return ctx.ok({
        accessToken,
      })
    } catch (err) {
      console.error(err);
      ctx.cookies.set('access_token', '', {
        httpOnly: true,
        sameSite: true,
      });
      ctx.cookies.set('refresh_token', '', {
        httpOnly: true,
        sameSite: true,
        path: `${env.API_PREFIX}/auth`,
      });

      if (err.message.indexOf('jwt expired') !== -1) {
        return ctx.unauthorized({ sessionExpired: true, message: `Сессия истекла.` })
      }
      return ctx.badRequest({ message: err.message })
    }
  }

  // TODO: update refresh to this: 
  // https://gist.github.com/zmts/802dc9c3510d79fd40f9dc38a12bccfc
  @post("/refresh")
  async refresh(ctx) {
    try {
      let account;

      const refreshToken = ctx.cookies.get('refresh_token');

      if (refreshToken) {
        const data = decodeJwt(refreshToken, 'refresh');

        account = await UsersRepo.loginByEmail(data.email);

        if (!account || refreshToken.localeCompare(account.authData.refreshToken) !== 0) {
          log(LOG_REFRESH_FAILED, ctx.request.href, 'Invalid Refresh Token');
          throw new Error('Refresh Token is invalid');
        }
      }

      const accessToken = await generateJwt(account);
      ctx.cookies.set('access_token', accessToken, {
        httpOnly: true,
        sameSite: true,
        expires: new Date(moment().add(1, 'hour').toISOString()),
      });

      return ctx.ok({
        accessToken: accessToken,
      })
    } catch (err) {
      ctx.cookies.set('access_token', '', {
        httpOnly: true,
        sameSite: true,
      });
      ctx.cookies.set('refresh_token', '', {
        httpOnly: true,
        sameSite: true,
        path: `${env.API_PREFIX}/auth`,
      });

      if (err.message.indexOf('jwt expired') !== -1) {
        return ctx.unauthorized({ sessionExpired: true, message: `Refresh token expired` })
      }
      if (err.message.localeCompare('Refresh Token is invalid') === 0) {
        return ctx.unauthorized({ sessionExpired: true, message: err.message })
      }

      return ctx.badRequest({ message: err.message })
    }
  }

  @post("/logout")
  async logout(ctx) {
    ctx.cookies.set('access_token', '', {
      httpOnly: true,
      sameSite: true,
    });
    ctx.ok({});
  }

  @post("/forgot-password")
  async forgotPasswd(ctx) {
    const req = ctx.request;
    if (!req.body.email) {
      ctx.badRequest("Email is missing");
    }

    const { error } = validation.validateEmail(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return
    }

    let sent = await UsersRepo.forgotPasswd(req.body);
    if (typeof sent !== 'undefined') {
      ctx.badRequest("Forgot pass flow is failed.");
      return
    }
    ctx.ok()
  }

  @post("/reset-password")
  async resetPasswd(ctx) {
    const req = ctx.request;

    const { error } = validation.validateResetPasswd(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return;
    }

    let user = await UsersRepo.resetPasswd(req.body);

    log(LOG_RECOVER_PASSWORD, { email: user.email, token: req.body.token });

    if (typeof user === 'undefined') {
      ctx.badRequest("Failed to reset user password.");
      return;
    }
    ctx.ok({
      id: user.id,
    });
  }

  @post("/confirm")
  async confirmEmail(ctx) {
    const req = ctx.request;

    const { error } = validation.validateConfirmEmail(req.body);
    if (error) {
      ctx.badRequest(error.details[0].message);
      return;
    }

    let user = await UsersRepo.confirm(req.body);

    if (!user) {
      ctx.badRequest("Failed to confirm email.");
      return;
    }
    log(LOG_CONFIRM_EMAIL, { email: user.email, token: req.body.token });

    ctx.ok();
  }
}