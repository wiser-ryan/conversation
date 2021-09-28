import Logger from './lib/Logger';
import chalk from 'chalk';

const instance = new Logger({});

instance.register('info', chalk.cyan);
instance.register('warn', chalk.yellow);
instance.register('error', chalk.red);

instance.register('updated', chalk.magenta);
instance.register('created', chalk.green);
instance.register('skip', chalk.grey);

export default instance;
