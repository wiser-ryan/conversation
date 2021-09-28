import path from 'path';
import UploadOrchestrator from './lib/UploadOrchestrator';
import { wrapAction } from './lib/utils';
import getConfig from './lib/config';
import program from 'commander';
import recursiveReaddir from 'recursive-readdir';
import logger from './logger';
import chalk from 'chalk';

type UploadArgs = {
  prefix: string;
  overwrite?: boolean;
  skipInvalidate?: boolean;
};

const action = async ({ prefix = '', skipInvalidate, overwrite }: UploadArgs) => {
  let { Project, AWS } = getConfig();
  const buildOutput = path.resolve(process.cwd(), Project.BuildOutput);
  let files = await recursiveReaddir(buildOutput);
  let tuples = files.map((file) => [file, path.join(prefix, path.relative(buildOutput, file))]);
  let uploader = new UploadOrchestrator({
    overwrite,
    dryRun: program.dryRun,
    logger,
    skipInvalidate,
    waitInvalidate: true,
    Bucket: AWS.S3.Bucket,
    DistributionId: AWS.CloudFront.DistributionId,
  });
  tuples.forEach(([file, target]) => uploader.queueFile(file, target));
  await uploader.flush();
};

const help = `
Example:

$ wise upload --prefix 1.0

Uploads the current files in the build output directory to S3 and creates an invalidation, not to be confused with the ${chalk.bold(
  'deploy'
)} command.
`;

program
  .command('upload')
  .description('Upload build output to AWS')
  .requiredOption('--prefix <prefix>', 'Destination path in the bucket')
  .option('--skipInvalidate', 'Skip invalidation')
  .option('--overwrite', 'Overwrite files')
  .on('--help', () => console.log(help))
  .action(wrapAction(action));
