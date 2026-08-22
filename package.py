"""
将 index.html + styles.css + script.js 打包成单个 HTML 文件，
然后上传到 0x0.st 获取永久公网链接。
"""
import re
import urllib.request
import mimetypes
import os

BASE = os.path.dirname(os.path.abspath(__file__))

# 1. 读取三个文件
with open(os.path.join(BASE, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()
with open(os.path.join(BASE, "styles.css"), "r", encoding="utf-8") as f:
    css = f.read()
with open(os.path.join(BASE, "script.js"), "r", encoding="utf-8") as f:
    js = f.read()

# 2. 替换 <link> 引用为内联 <style>（用函数替换避免转义问题）
html = re.sub(
    r'<link[^>]*href=["\']styles\.css["\'][^>]*/?>',
    lambda m: '<style>\n' + css + '\n</style>',
    html,
    flags=re.IGNORECASE,
)

# 3. 替换 <script src="script.js"> 为内联 <script>
html = re.sub(
    r'<script[^>]*src=["\']script\.js["\'][^>]*>\s*</script>',
    lambda m: '<script>\n' + js + '\n</script>',
    html,
    flags=re.IGNORECASE,
)

# 4. 保存单文件版本
output_path = os.path.join(BASE, "portfolio-single.html")
with open(output_path, "w", encoding="utf-8") as f:
    f.write(html)

size_kb = os.path.getsize(output_path) / 1024
print(f"单文件已生成: portfolio-single.html ({size_kb:.1f} KB)")

# 5. 上传到 0x0.st
print("正在上传到 0x0.st ...")

import uuid
boundary = uuid.uuid4().hex

body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="portfolio.html"\r\n'
    f"Content-Type: text/html\r\n\r\n"
    f"{html}\r\n"
    f"--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(
    "https://0x0.st",
    data=body,
    method="POST",
)
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
req.add_header("User-Agent", "Mozilla/5.0")

try:
    resp = urllib.request.urlopen(req, timeout=60)
    url = resp.read().decode("utf-8").strip()
    print(f"\n=== 上传成功！===")
    print(f"永久链接: {url}")
except Exception as e:
    print(f"上传失败: {e}")
    # 尝试备用方案：catbox.moe
    print("尝试备用上传服务 catbox.moe ...")
    try:
        body2 = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="reqtype"\r\n\r\n'
            f"fileupload\r\n"
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="fileToUpload"; filename="portfolio.html"\r\n'
            f"Content-Type: text/html\r\n\r\n"
            f"{html}\r\n"
            f"--{boundary}--\r\n"
        ).encode("utf-8")
        req2 = urllib.request.Request("https://catbox.moe/user/api.php", data=body2, method="POST")
        req2.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        req2.add_header("User-Agent", "Mozilla/5.0")
        resp2 = urllib.request.urlopen(req2, timeout=60)
        url2 = resp2.read().decode("utf-8").strip()
        print(f"\n=== 上传成功！===")
        print(f"永久链接: {url2}")
    except Exception as e2:
        print(f"备用上传也失败: {e2}")
        print(f"\n单文件已保存为: portfolio-single.html")
        print("可以手动上传到任意静态托管服务")
