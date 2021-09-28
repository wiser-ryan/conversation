import sucrase from '@rollup/plugin-sucrase';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import path from 'path';
import pkg from '../package.json';
import builtin from 'builtin-modules';
import executable from 'rollup-plugin-executable';

export default {
  input: path.join(__dirname, './index.ts'),
  output: {
    banner: '#!/usr/bin/env node',
    format: 'cjs',
  },
  external: [...builtin, ...Object.keys(pkg.dependencies)],
  plugins: [
    executable(),
    resolve({
      extensions: ['.js', '.ts', '.json'],
    }),
    json(),
    commonjs(),
    sucrase({
      exclude: ['node_modules/**'],
      transforms: ['typescript'],
    }),
  ],
};
