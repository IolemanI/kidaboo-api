import { logger } from '../lib/logger'
import { env } from '../lib/env'

/**
 * Error handler middlewarerr.
 * Uses status code from error if present.
 */
export async function errorHandler(ctx, next) {
    try {
        await next();
    } catch (err) {

        if (err.name === 'RequestValidationError') {
            ctx.status = 400
            ctx.body = {
                code: 1,
                message: err.message,
                data: err.data,
            }
        } else if (err.name === 'ResponseValidationError') {
            ctx.status = 500
            ctx.body = {
                code: 1,
                message: err.message,
                data: err.data,
            }
        } else {
            ctx.status = (err && err.statusCode) || 500;

            ctx.body = err && (err.toJSON ? err.toJSON() : { message: err.message, ...err });
        }
        /* istanbul ignore next */
        if (!env.EMIT_STACK_TRACE) {
            delete ctx.body.stack
        }
        logger.error('Error in request', err)
    }
}
