const http = require('http');

const data = new URLSearchParams({
  title: 'Test Event',
  description: 'This is a long enough description to bypass validation.',
  location: 'Test Location',
  startDate: '2027-01-01T12:00',
  endDate: '2027-01-01T14:00',
  capacity: '10'
}).toString();

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/events/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
