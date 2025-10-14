const { exec } = require('child_process');

console.log('Checking if Node.js is installed...');

exec('node --version', (error, stdout, stderr) => {
  if (error) {
    console.error('Node.js is not installed or not in PATH');
    console.log('Please install Node.js from https://nodejs.org/');
    return;
  }
  
  console.log(`Node.js version: ${stdout}`);
  
  exec('npm --version', (error, stdout, stderr) => {
    if (error) {
      console.error('npm is not installed or not in PATH');
      console.log('Please install Node.js from https://nodejs.org/ which includes npm');
      return;
    }
    
    console.log(`npm version: ${stdout}`);
    console.log('Node.js and npm are installed correctly!');
    console.log('You can now run "npm install" to install dependencies');
  });
});