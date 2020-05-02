import { createServer } from '../lib/server'
import { env } from '../lib/env'
import { logger } from '../lib/logger'
import { initConnection, syncDB } from '../lib/db'
import 'regenerator-runtime/runtime';

void async function bootstrap() {
    try {
        await initConnection();

        await syncDB();

        const app = await createServer();

        app.listen(env.PORT, () => {
            const mode = env.NODE_ENV;
            logger.debug(`Server listening on ${env.PORT} in ${mode} mode`)
        });
    } catch (err) {
        console.info(err);
        logger.error('Error while starting up server', err);
        process.exit(1); // eslint-disable-line no-undef
    }
}();
