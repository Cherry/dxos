const { exec } = require('node:child_process');
const { writeFile, readFile } = require('node:fs/promises');
const { promisify } = require('node:util');

monitors = [
  './tools/monitors/cli-monitor',
  './tools/monitors/hello-template-monitor',
  './tools/monitors/messaging-monitor',
];

const monitor = async (path) => {
  try {
    await promisify(exec)('rm -rf node_modules', { cwd: path });
    const { stdout: branch } = await exec('git branch --show-current');
    const packagePath = `${path}/package.json`;
    const packageJson = await readFile(packagePath, 'utf-8');
    switch (branch) {
      case 'production':
        console.log('Setting up production...');
        await writeFile(packagePath, packageJson.replaceAll('main', 'latest'));
        break;

      case 'staging':
        console.log('Setting up staging...');
        await writeFile(packagePath, packageJson.replaceAll('main', 'next'));
        break;
    }
    const { stdout } = await promisify(exec)('npm run start', { cwd: path });
    console.log(`SUCCESS: ${path}`);
    console.log(stdout);
  } catch (err) {
    console.log(`FAILED: ${path}`);
    console.error(err.stdout ?? err);
    throw err;
  }
}

void Promise.allSettled(monitors.map(monitor)).then((results) => {
  const failed = results.some((result) => result.status === 'rejected');
  process.exit(failed ? 1 : 0);
});
