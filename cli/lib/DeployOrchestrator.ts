import path from 'path';
import UploadOrchestrator, { UploadOrchestratorInterface } from './UploadOrchestrator';
import recursiveReaddir from 'recursive-readdir';
import { URL } from 'url';
import execa from 'execa';
import chalk from 'chalk';
import Logger from './Logger';

/**
 * All the reaquired properties to instantiate a DeployOrchestrator
 */
export abstract class DeployOrchestratorInterface {
  readonly Bucket: string;
  readonly DistributionId: string;
  readonly logger: Logger;
  readonly buildPath: string;
  readonly tag: string;
  readonly protocol?: string;
  readonly storybook?: boolean;
  readonly env: Record<string, string>;

  constructor(options: DeployOrchestratorInterface) {
    if (/^\//.test(options.tag)) {
      throw new Error("Tag can't start with /");
    }
    this.Bucket = options.Bucket;
    this.DistributionId = options.DistributionId;
    this.logger = options.logger;
    this.buildPath = options.buildPath;
    this.tag = options.tag;
    this.protocol = options.protocol || 'https';
    this.storybook = options.storybook || false;
    this.env = options.env;
  }
}

/**
 * DeployOrchestrator instances trigger full application deploys by uploading all the files present
 * in the build output to S3 with a "tag" prefix (e.g. "v1.0/") and then overwrites the "index.html"
 * file located in the bucket's root to the one under the tag prefix so the CDN starts fetching the
 * new html file to clients.
 * It can be used without necessarily building the application
 * ```jsx
 * let deployer = new DeployOrchestrator({ tag: 'v1.0' });
 * // trigger webpack build and queue up all output files
 * await deployer.build('www.wiseassistant.com');
 * // upload all files and invalidate cdn
 * await deployer.activate();
 */
export default class DeployOrchestrator extends DeployOrchestratorInterface {
  readonly uploader: UploadOrchestrator;

  constructor(options: UploadOrchestratorInterface & DeployOrchestratorInterface) {
    super(options);

    this.uploader = new UploadOrchestrator(options);
  }

  getPublicUrl(hostname: string, pathname: string = '') {
    return new URL(pathname, `${this.protocol}://${hostname}`).toString();
  }

  /**
   * Triggers a webpack build
   * @param hostname Domain from where these files being served from to client browsers
   */
  async build(hostname: string) {
    const PUBLIC_URL = this.getPublicUrl(hostname, this.tag);
    const env = {
      ...this.env,
      PUBLIC_URL,
      STORYBOOK_PUBLIC_URL: path.join('/', this.tag, 'storybook'),
    };
    this.logger.log(
      'info',
      `Building app with custom env\n${chalk.grey(JSON.stringify(env, null, 2))}`
    );
    await execa('yarn', ['build'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env,
      },
    });
    if (this.storybook) {
      await execa('yarn', ['build-storybook'], {
        stdio: 'inherit',
        env: {
          ...process.env,
          ...env,
        },
      });
    }
  }

  /**
   * Copy index.html to root and flush
   */
  async activate() {
    this.uploader.copyFile(path.join(this.tag, 'index.html'), 'index.html');
  }

  async prepare() {
    let files = await recursiveReaddir(this.buildPath);
    let paths = files.map((file) => [
      file,
      path.join(this.tag, path.relative(this.buildPath, file)),
    ]);
    paths.forEach(([source, target]) => this.uploader.queueFile(source, target));
  }

  async upload() {
    await this.uploader.flush();
  }
}
