"""上传 portfolio-single.html 到 tmpfiles.org"""
import urllib.request
import uuid
import ssl

# 创建 SSL 上下文（宽松验证）
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

boundary = uuid.uuid4().hex

with open("portfolio-single.html", "rb") as f:
    data = f.read()

header = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="portfolio.html"\r\n'
    f"Content-Type: text/html\r\n\r\n"
).encode("utf-8")

footer = f"\r\n--{boundary}--\r\n".encode("utf-8")
body = header + data + footer

# 尝试多个服务
services = [
    ("tmpfiles.org", "https://tmpfiles.org/api/v1/upload"),
    ("file.io", "https://file.io"),
    ("0x0.st", "https://0x0.st"),
    ("catbox.moe", "https://catbox.moe/user/api.php"),
]

for name, url in services:
    print(f"尝试上传到 {name} ...")
    try:
        if name == "catbox.moe":
            # catbox 需要额外的 reqtype 字段
            extra = (
                f"--{boundary}\r\n"
                f'Content-Disposition: form-data; name="reqtype"\r\n\r\n'
                f"fileupload\r\n"
            ).encode("utf-8")
            body2 = extra + header + data + footer
        else:
            body2 = body

        req = urllib.request.Request(url, data=body2, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
        req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")

        resp = urllib.request.urlopen(req, timeout=60, context=ctx)
        result = resp.read().decode("utf-8").strip()
        print(f"  成功! 返回: {result}")

        # tmpfiles.org 返回 JSON，需要提取 URL
        if name == "tmpfiles.org" and "url" in result:
            import json
            j = json.loads(result)
            link = j.get("data", {}).get("url", result)
            # 转换为直接访问链接
            link = link.replace("tmpfiles.org/", "tmpfiles.org/dl/")
            print(f"\n=== 永久链接 ===")
            print(f"{link}")
            break
        elif name == "file.io" and "link" in result:
            import json
            j = json.loads(result)
            print(f"\n=== 永久链接 ===")
            print(f"{j.get('link', result)}")
            break
        else:
            print(f"\n=== 永久链接 ===")
            print(f"{result}")
            break
    except Exception as e:
        print(f"  失败: {e}")
        continue
else:
    print("\n所有上传服务都失败了。")
    print("单文件已保存为 portfolio-single.html，可手动上传。")
