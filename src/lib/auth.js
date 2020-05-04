import jwt from 'jsonwebtoken';
import { env } from './env';

export function generateJwt(user, type = 'access') {
  let secret = env.JWT_ACCESS_SECRET;
  const options = {
    expiresIn: '1h'
  };
  if (type === 'refresh') {
    secret = env.JWT_REFRESH_SECRET;
    options.expiresIn = '30d';
  }

  const params = {
    email: user.email
  };

  return jwt.sign(params, secret, options);
}

export function decodeJwt(token, type = 'access') {
  let secret = env.JWT_ACCESS_SECRET;
  if (type === 'refresh') {
    secret = env.JWT_REFRESH_SECRET;
  }

  return jwt.verify(token, secret);
}
