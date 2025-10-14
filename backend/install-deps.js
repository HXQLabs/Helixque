const { exec } = require('child_process');

console.log('Installing dependencies...');
exec('npm install', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error installing dependencies: ${error}`);
    return;
  }
  console.log('Dependencies installed successfully!');
  console.log(stdout);
  if (stderr) {
    console.error(stderr);
  }
});