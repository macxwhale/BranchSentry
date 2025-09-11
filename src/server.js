// This file is the entry point for iisnode.
// It uses the "next" command to start the application in production mode.
// It will look for the ".next" folder, which is created by running "npm run build".

const { exec } = require('child_process');

// The port is dynamically assigned by iisnode, passed via process.env.PORT
const port = process.env.PORT || 3000;

// Use the standard Next.js production server
const command = `next start -p ${port}`;

const child = exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
