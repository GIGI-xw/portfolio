// 上传到 0x0.st（永久公网，直链可访问）
const fs = require('fs');
const https = require('https');
const path = require('path');
const http = require('http');

const filePath = path.join(__dirname, 'portfolio-single.html');
const fileBuf = fs.readFileSync(filePath);
const boundary = '----Boundary' + Date.now().toString(16);

function buildBody() {
  const parts = [];
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="portfolio.html"\r\nContent-Type: text/html\r\n\r\n`;
  parts.push(Buffer.from(header, 'utf-8'));
  parts.push(fileBuf);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return Buffer.concat(parts);
}
const body = buildBody();

console.log('文件大小:', (fileBuf.length / 1024).toFixed(1), 'KB');

const services = [
  {
    name: '0x0.st',
    hostname: '0x0.st',
    port: 443,
    path: '/',
    https: true,
    rejectUnauthorized: false
  },
  {
    name: 'tmpfiles.org',
    hostname: 'tmpfiles.org',
    port: 443,
    path: '/api/v1/upload',
    https: true,
    rejectUnauthorized: false
  }
];

function tryService(index) {
  const svc = services[index];
  if (!svc) {
    console.log('\n所有服务失败。请手动上传 portfolio-single.html。');
    return;
  }
  console.log(`\n尝试: ${svc.name} ...`);

  const mod = svc.https ? https : http;
  const req = mod.request({
    hostname: svc.hostname,
    port: svc.port,
    path: svc.path,
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
      'User-Agent': 'curl/8.0.0'
    },
    rejectUnauthorized: svc.rejectUnauthorized,
    timeout: 120000
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('  状态码:', res.statusCode);
      console.log('  返回:', d.trim().slice(0, 500));
      // 匹配 URL
      const urls = d.match(/https?:\/\/[^\s"'<]+/g);
      if (urls) {
        console.log('\n✅  链接提取成功:');
        urls.forEach(u => console.log(' ', u));
      } else {
        tryService(index + 1);
      }
    });
  });
  req.on('error', (e) => {
    console.log('  错误:', e.message);
    tryService(index + 1);
  });
  req.on('timeout', () => { req.destroy(new Error('超时')); });
  req.write(body);
  req.end();
}

tryService(0);
