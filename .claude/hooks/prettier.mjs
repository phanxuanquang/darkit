// PostToolUse: format the edited file with the repo's Prettier. Exit 2 on parse errors so Claude fixes them.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const file = JSON.parse(input).tool_input?.file_path;
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const rel = file && relative(root, file);
if (!rel || rel.startsWith('..') || isAbsolute(rel) || !existsSync(file)) process.exit(0);

const prettier = join(root, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
if (!existsSync(prettier)) {
  console.error('prettier hook: run `npm install` to enable auto-formatting');
  process.exit(0);
}
const run = spawnSync(process.execPath, [prettier, '--write', '--ignore-unknown', file], {
  cwd: root,
  encoding: 'utf8',
});
if (run.status !== 0) {
  console.error(`prettier failed on ${rel}:\n${run.stderr}`);
  process.exit(2);
}
