import jwt from 'jsonwebtoken';
import crypto from "crypto";
import { env } from '../lib/env';

export function generateToken() {
  let token = crypto.randomBytes(20).toString('hex');

  return jwt.sign({ token }, env.JWT_TOKEN_SECRET, {
    expiresIn: '24h'
  });
}

export function decodeToken(token) {
  return jwt.verify(token, env.JWT_TOKEN_SECRET);
}
