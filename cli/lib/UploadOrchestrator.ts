import AWS from 'aws-sdk';
import pLimit from 'p-limit';
import fs from 'fs';
import chalk from 'chalk';
import S3 from './S3';
import CloudFront from './CloudFront';
import { settle } from './utils';
import mime from 'mime-types';
import pRetry from 'p-retry';
import crypto from 'crypto';
import Logger from './Logger';
import path from 'path';

/**
 * All the reaquired properties to instantiate an UploadOrchestrator
 */
export abstract class UploadOrchestratorInterface {
  readonly Bucket: string;
  readonly DistributionId: string;
  readonly maxWorkers?: number;
  readonly dryRun?: boolean;
  readonly readOnly?: boolean;
  readonly waitInvalidate?: boolean;
  readonly skipInvalidate?: boolean;
  readonly overwrite?: boolean;
  readonly logger: Logger;

  constructor(options: UploadOrchestratorInterface) {
    let foptions = Object.assign(
      {},
      {
        dryRun: false,
        readOnly: true,
        maxWorkers: 10,
        waitInvalidate: false,
        skipInvalidate: false,
        overwrite: false,
      },
      options
    );
    this.Bucket = foptions.Bucket;
    this.DistributionId = foptions.DistributionId;
    this.maxWorkers = foptions.maxWorkers;
    this.readOnly = foptions.readOnly;
    this.dryRun = foptions.dryRun;
    this.waitInvalidate = foptions.waitInvalidate;
    this.skipInvalidate = foptions.skipInvalidate;
    this.overwrite = foptions.overwrite;
    this.logger = foptions.logger;
  }
}

class Task {
  constructor(public type: 'upload' | 'copy', public source: string, public target: string) {}

  print() {
    return `${this.source} -> ${this.target}`;
  }
}

const ALLOWED_REMOTE_PATH = /\S/;

/**
 * UploadOrchestrator instances handle all the needed changes done to the S3 bucket and the CDN.
 * It's designed in a way that these changes are made in batches, first you queue up a list of
 * "tasks" and then you flush the list like so:
 * ```jsx
 * uploader.queueFile('./index.html', 'v1.0/index.html');
 * uploader.copyFile('v1.0/index.html', 'index.html');
 * await uploader.flush(); // <- pushes the changes to S3 and CloudFront
 */
export default class UploadOrchestrator extends UploadOrchestratorInterface {
  private tasks: Array<Task>;

  constructor(options: UploadOrchestratorInterface) {
    super(options);
    this.tasks = [];
  }

  getPreview() {
    return this.tasks;
  }

  /**
   * Appends an upload task to the queue
   */
  queueFile(filePath: string, remotePath: string) {
    if (!ALLOWED_REMOTE_PATH.test(remotePath))
      throw new Error(
        `File at '${filePath}' has a bad remotePath '${remotePath}' must match ${ALLOWED_REMOTE_PATH.toString()}`
      );
    this.tasks.push(new Task('upload', filePath, remotePath));
  }

  /**
   * Appends a copy task to the queue
   */
  copyFile(remoteSource: string, remoteTarget: string) {
    this.tasks.push(new Task('copy', remoteSource, remoteTarget));
  }

  /**
   * Invalidate all the paths in the CDN, this is needed if you've done changes to the S3 bucket and
   * need the CDN to delete its cache so it reads from the bucket again.
   */
  async invalidate(paths: Array<string>) {
    if (paths.length === 0) return;
    let absolutePaths = paths.map((p) => `/${p}`);
    this.logger.log(
      'info',
      `Creating invalidation for paths\n${absolutePaths
        .map((p) => chalk.grey(`- ${p}`))
        .join('\n')}`
    );
    let invalidation = await CloudFront.createInvalidation({
      DistributionId: this.DistributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: paths.length,
          Items: absolutePaths,
        },
      },
    }).promise();
    if (this.waitInvalidate) {
      this.logger.log(
        'info',
        `Waiting for invalidation ${invalidation.Invalidation!.Id} to finish`
      );
      await CloudFront.waitFor('invalidationCompleted', {
        DistributionId: this.DistributionId,
        Id: invalidation.Invalidation!.Id,
      }).promise();
    }
  }

  /**
   * Execute a task.
   * - Tasks of type `upload` will upload the contents of a file at path `task.source` to the bucket
   *   at path `task.target`
   * - Tasks of type `copy` will copy an S3 object in the bucket located in key `task.source` to the
   *   key `task.target`
   */
  private async runTask(task: Task) {
    let result;
    let head = await settle(
      S3.headObject({
        Key: task.target,
        Bucket: this.Bucket,
      }).promise()
    );
    if (task.type === 'upload') {
      let Body = await fs.promises.readFile(task.source);
      let md5 = crypto.createHash('md5').update(Body).digest('hex');
      let ContentType = mime.contentType(path.extname(task.source)) || undefined;
      if (
        !this.overwrite &&
        head.status === 'fulfilled' &&
        JSON.parse(head.value!.ETag!) === md5 &&
        head.value!.ContentType === ContentType
      ) {
        this.logger.log('skip', task.print());
      } else {
        result = await S3.putObject({
          ContentType,
          Bucket: this.Bucket,
          Key: task.target,
          Body,
        }).promise();
        if (head.status === 'fulfilled') {
          this.logger.log('updated', task.print());
        } else {
          this.logger.log('created', task.print());
        }
      }
    } else if (task.type === 'copy') {
      let headSource = await settle(
        S3.headObject({
          Key: task.source,
          Bucket: this.Bucket,
        }).promise()
      );
      if (headSource.status === 'rejected') {
        throw new Error(`Object doesn't exist`);
      } else if (this.overwrite || head.value?.ETag !== headSource.value?.ETag) {
        result = await S3.copyObject({
          Key: task.target,
          Bucket: this.Bucket,
          CopySource: `/${this.Bucket}/${task.source}`,
        }).promise();
        this.logger.log('updated', task.print());
      } else {
        this.logger.log('skip', task.print());
      }
    } else {
      throw new Error(`Unknown object type ${task.type}`);
    }
    return result;
  }

  /**
   * Execute all the tasks in the queue and wait for them to complete, limits the concurrency of
   * execution to `maxWorkers` and will retry tasks that fail. If all tasks succeed it will then
   * proceed to trigger an invalidation for all `task.target` paths in the CDN for each of the
   * tasks.
   * NOTE: If _any_ of the tasks fail it will **not** rollback the changes, this is intentional.
   */
  async flush() {
    if (this.tasks.length === 0) return;
    let limit = pLimit(this.maxWorkers!);
    if (this.dryRun) {
      this.logger.log('info', this.tasks.map((t) => chalk.grey(t.print())).join('\n'));
    } else {
      let run = (tasks: Array<Task>) =>
        Promise.all(
          tasks.map(
            async (task) =>
              [
                task,
                await settle(limit(() => pRetry(() => this.runTask(task), { retries: 3 }))),
              ] as const
          )
        );
      /**
       * Its important to upload everything first and then do the copying to ensure the recently
       * uploaded files are the sources for the copying
       */
      let results = [
        ...(await run(this.tasks.filter((task) => task.type === 'upload'))),
        ...(await run(this.tasks.filter((task) => task.type === 'copy'))),
      ];
      const errors = results
        .filter(([, result]) => result.status === 'rejected')
        .map(([task, result]) => `${task.print()}\n${result.reason!.message}`);
      if (errors.length) {
        errors.forEach((error) => this.logger.error('error', error));
        throw new Error('Some errors occurred while uploading.');
      }
      if (!this.skipInvalidate) {
        await this.invalidate(
          results
            .filter(([, result]) => result.status === 'fulfilled' && result.value)
            .map(([task]) => task.target)
        );
      }
    }
    this.tasks = [];
  }
}
