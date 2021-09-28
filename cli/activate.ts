import program from 'commander';
import DeployOrchestrator from './lib/DeployOrchestrator';
import getConfig from './lib/config';
import { wrapAction } from './lib/utils';
import inquirer from 'inquirer';
import S3 from './lib/S3';
import logger from './logger';
import path from 'path';

const action = async (tag?: string) => {
  let { AWS, Project, Environment } = getConfig();
  if (!tag) {
    let objects = await S3.listObjectsV2({
      Bucket: AWS.S3.Bucket,
      Delimiter: '/',
    }).promise();
    let tags = await Promise.all(
      objects.CommonPrefixes!.map(async ({ Prefix }) => {
        let Key = path.join(Prefix!, 'index.html');
        let { LastModified } = await S3.headObject({
          Bucket: AWS.S3.Bucket,
          Key,
        }).promise();
        return { LastModified, Prefix };
      })
    );
    let choices = tags
      .sort((a, b) => a.LastModified!.valueOf() - b.LastModified!.valueOf())
      .map((o) => ({
        name: `${o.Prefix!} - ${o.LastModified!.toLocaleString()}`,
        value: o.Prefix,
      }));
    let answers = await inquirer.prompt<{ tag: string }>([
      {
        type: 'list',
        name: 'tag',
        choices,
        message: 'Select which tag to set live',
      },
    ]);
    tag = answers.tag;
  }
  let deployer = new DeployOrchestrator({
    tag,
    env: Environment,
    buildPath: Project.BuildOutput,
    logger,
    overwrite: false,
    dryRun: program.dryRun,
    skipInvalidate: false,
    waitInvalidate: true,
    Bucket: AWS.S3.Bucket,
    DistributionId: AWS.CloudFront.DistributionId,
  });
  await deployer.activate();
};

const help = `
Example:

$ wise activate

Will show you a prompt with all the available versions uploaded to S3, from which you can pick, it will then switch the current live version to that one
`;

program
  .command('activate [tag]')
  .description('Set the current live tag of the site')
  .on('--help', () => console.log(help))
  .action(wrapAction(action));
