import path from 'path';
import dotenv from 'dotenv';
import yaml from 'yaml';
import fs from 'fs';
import program from 'commander';

const CWD = process.cwd();

dotenv.config({
  path: path.resolve(CWD, '.env'),
});

const requiredEnv = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required env variables:\n${missing.map((key) => `- ${key}`).join('\n')}`);
  process.exit(1);
}

type Config = {
  AWS: {
    S3: {
      Bucket: string;
    };
    CloudFront: {
      DistributionId: string;
    };
  };
  Project: {
    BuildOutput: string;
    Hostname: string;
    SlackChannel?: string;
  };
  Environment: Record<string, string>;
};

let config: Config;

export default (): Config => {
  config = config || yaml.parse(fs.readFileSync(path.resolve(CWD, program.config), 'utf8'));
  return config;
};
