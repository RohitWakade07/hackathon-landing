const http = require('http');
const fs = require('fs');
const path = require('path');

const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
const filePath = path.join(__dirname, '..', 'README.md');
const fileData = fs.readFileSync(filePath);

const fields = {
  teamName: 'Automated Test Team',
  teamSize: '2',
  name: 'Auto Tester',
  phone: '9876543210',
  email: 'auto@test.example',
  college: 'Auto College',
  year: 'BE',
  track: 'Track 1: Data Science',
  github: 'https://github.com/auto',
  experience: 'Beginner',
  members: 'X,Y',
  projectIdea: 'Testing via script',
  agree: 'on',
  consent: 'on'
};

let body = '';
for (const k of Object.keys(fields)) {
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="${k}"\r\n\r\n`;
  body += `${fields[k]}\r\n`;
}
body += `--${boundary}\r\n`;
body += `Content-Disposition: form-data; name="ppt"; filename="testfile.pdf"\r\n`;
body += `Content-Type: application/pdf\r\n\r\n`;

const pre = Buffer.from(body, 'utf8');
const post = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');

const contentLength = pre.length + fileData.length + post.length;

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/submit',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': contentLength
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk.toString());
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log('HEADERS', res.headers);
    console.log('BODY', data);
  });
});

req.on('error', (e) => { console.error('Request error', e); });

req.write(pre);
req.write(fileData);
req.write(post);
req.end();


