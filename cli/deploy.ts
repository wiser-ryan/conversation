import program from 'commander';
import DeployOrchestrator from './lib/DeployOrchestrator';
import getConfig from './lib/config';
import { wrapAction } from './lib/utils';
import inquirer from 'inquirer';
import CloudFront from './lib/CloudFront';
import S3 from './lib/S3';
import logger from './logger';

type DeployArgs = {
  tag: string;
  protocol: string;
  overwrite?: boolean;
  storybook?: boolean;
  skipActivate?: boolean;
  skipBuild?: boolean;
  yes?: boolean;
};

const action = async ({
  yes = Boolean(process.env.CI),
  tag,
  skipActivate,
  skipBuild,
  storybook,
  protocol,
  overwrite,
}: DeployArgs) => {
  let now = Date.now();
  let { AWS, Project, Environment } = getConfig();
  if (!Project.Hostname) {
    if (yes) {
      throw new Error('No hostname specified');
    }
    let { Distribution } = await CloudFront.getDistribution({
      Id: AWS.CloudFront.DistributionId,
    }).promise();
    let { LocationConstraint } = await S3.getBucketLocation({
      Bucket: AWS.S3.Bucket,
    }).promise();
    let answers = await inquirer.prompt<{ hostname: string }>([
      {
        type: 'list',
        choices: ([] as Array<string | undefined>)
          .concat(
            Distribution?.DistributionConfig?.Aliases?.Items,
            Distribution?.DomainName!,
            `${AWS.S3.Bucket}.s3-website.${LocationConstraint}.amazonaws.com`
          )
          .filter(Boolean),
        name: 'hostname',
        message: 'Which hostname to use',
      },
    ]);
    Project.Hostname = answers.hostname;
  }
  let deployer = new DeployOrchestrator({
    tag,
    buildPath: Project.BuildOutput,
    logger,
    overwrite,
    storybook,
    protocol,
    dryRun: program.dryRun,
    waitInvalidate: true,
    env: Environment,
    Bucket: AWS.S3.Bucket,
    DistributionId: AWS.CloudFront.DistributionId,
  });
  if (!skipBuild) {
    await deployer.build(Project.Hostname);
  }
  await deployer.prepare();
  if (!skipActivate) {
    await deployer.activate();
  }
  if (!yes) {
    logger.log('info', `Using hostname ${Project.Hostname}`);
    logger.log('info', `Using tag ${tag}`);
    logger.log(
      'info',
      deployer.uploader
        .getPreview()
        .map((task) => `- ${deployer.getPublicUrl(Project.Hostname, task.target)}`)
        .join('\n')
    );
    let { ok } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ok',
        message: 'Are these ok?',
      },
    ]);
    if (!ok) return;
  }
  await deployer.upload();
  logger.log('info', `Done in ${((Date.now() - now) / 1000).toFixed(2)}s`);
};

const help = `
Example:

$ wise deploy --tag 1.0

Triggers a webpack build of the application and uploads it to the CDN with the tag as a prefix in the url path, but also replaces the root index.html to reference the newly uploaded files.
`;

program
  .command('deploy')
  .description('Deploy app to AWS')
  .requiredOption('--tag <tag>', 'Destination path in the bucket')
  .option('--skipActivate', 'Prevent CDN invalidation or change index.html')
  .option('--skipBuild', 'Skip building the app')
  .option('--overwrite', 'Overwrite files')
  .option('--storybook', 'Build storybook')
  .option('--protocol <protocol>', 'Protocol for accessing the files', 'https')
  .option('--yes', 'Skip all checks')
  .on('--help', () => console.log(help))
  .action(wrapAction(action));
