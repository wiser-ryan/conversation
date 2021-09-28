import path from 'path';
import fs from 'fs';
import { wrapAction } from './lib/utils';
import CloudFront from './lib/CloudFront';
import S3 from './lib/S3';
import getConfig from './lib/config';
import program from 'commander';

type FetchArgs = {
  out: string;
};

const action = async ({ out }: FetchArgs) => {
  const { AWS } = getConfig();
  let { Distribution } = await CloudFront.getDistribution({
    Id: AWS.CloudFront.DistributionId,
  }).promise();
  let { Policy } = await S3.getBucketPolicy({
    Bucket: AWS.S3.Bucket,
  }).promise();
  await fs.promises.writeFile(
    path.join(process.cwd(), out),
    JSON.stringify({ Distribution, Bucket: { Policy } }, null, 2)
  );
};

program
  .command('fetch')
  .description('Read AWS configs')
  .requiredOption('-o, --out <path>', 'Output json file')
  .action(wrapAction(action));
