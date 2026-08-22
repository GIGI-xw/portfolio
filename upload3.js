// 尝试多个命令行友好的文件托管服务
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const filePath = path.join(__dirname, 'portfolio-single.html');
const fileBuf = fs.readFileSync(filePath);
console.log('文件大小:', (fileBuf.length / 1024).toFixed(1), 'KB');

const services = [
  {
    name: 'transfer.sh',
    url: 'https://transfer.sh/portfolio.html',
    method: 'PUT',
    headers: { 'User-Agent': 'curl/8.0', 'Content-Length': fileBuf.length }
  },
  {
    name: 'bashupload.com',
    url: 'https://bashupload.com/portfolio.html',
    method: 'PUT',
    headers: { 'User-Agent': 'curl/8.0', 'Content-Length': fileBuf.length }
  },
  {
    name: 'envs.sh',
    url: 'https://envs.sh/',
    method: 'POST',
    multipart: true,
    fieldName: 'file'
  }
];

function doRequest(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      method: method,
      headers: headers,
      rejectUnauthorized: false,
      timeout: 180000
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d.trim() }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('超时')));
    if (body) req.write(body);
    req.end();
  });
}

function buildMultipart(fieldName, filename, contentType, data) {
  const boundary = '----Boundary' + Date.now().toString(16);
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(header, 'utf-8'), data, Buffer.from(footer, 'utf-8')]);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}

async function tryAll() {
  for (const svc of services) {
    try {
      console.log(`\n尝试: ${svc.name} (${svc.url}) ...`);
      let headers = { ...(svc.headers || {}) };
      let body;
      if (svc.multipart) {
        const mp = buildMultipart(svc.fieldName, 'portfolio.html', 'text/html', fileBuf);
        body = mp.body;
        headers['Content-Type'] = mp.contentType;
        headers['Content-Length'] = body.length;
      } else {
        body = fileBuf;
      }
      const r = await doRequest(svc.url, svc.method, headers, body);
      console.log('  状态码:', r.status);
      console.log('  返回:');
      console.log(r.body.slice(0, 1000));
      // 提取 URL
      const urls = r.body.match(/https?:\/\/[^\s"'<>\]]+/g);
      if (urls && urls.length) {
        console.log('\n======= 提取到的链接 =======');
        urls.forEach((u, i) => console.log(`  ${i+1}. ${u}`));
      }
      if (r.status >= 200 && r.status < 300) {
        console.log(`\n✅ ${svc.name} 上传成功！`);
        return;
      }
    } catch (e) {
      console.log('  失败:', e.message);
    }
  }
  console.log('\n所有服务失败。');
}

tryAll();
