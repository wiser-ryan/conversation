import chalk, { Chalk } from 'chalk';

class Logger {
  readonly dict: {
    [key: string]: Chalk;
  };
  private pad: number;
  readonly stdout: (msg: string) => void;
  readonly stderr: (msg: string) => void;

  constructor({ stdout = console.log, stderr = console.error }: Partial<Logger>) {
    this.dict = {};
    this.stdout = stdout;
    this.stderr = stderr;
    this.pad = 0;
  }

  register(prefix: string, color: Chalk) {
    this.dict[prefix] = color;
    this.pad = Math.max(this.pad, prefix.length);
  }

  prepare(prefix: string, msg: string) {
    let color = this.dict[prefix] || chalk.reset;
    return msg.split('\n').map((msg) => `${color(`[${prefix}]`)} ${msg}`);
  }

  log(prefix: string, msg: string) {
    this.prepare(prefix, msg).forEach((msg) => this.stdout(msg));
  }

  error(prefix: string, msg: string) {
    this.prepare(prefix, msg).forEach((msg) => this.stderr(msg));
  }
}

export default Logger;
