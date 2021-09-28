import program from 'commander';
import figlet from 'figlet';
import './upload';
import './deploy';
import './fetch';
import './activate';

const desc = `
Project CLI tools for deploying the application to AWS.
`.trim();

program
  .description(
    figlet.textSync('wise', {
      font: 'Ogre',
    }) + `\n\n${desc}`
  )
  .option('--dryRun', 'Do dry run of the command')
  .option('-c, --config <path>', 'Use custom config file', './wise-staging.yml');

program.parse(process.argv);
