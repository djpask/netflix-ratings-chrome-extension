import json
import urllib.request
import base64
import time
import sys
import websocket

def get_tabs(port=9222):
    try:
        url = f'http://127.0.0.1:{port}/json'
        with urllib.request.urlopen(url, timeout=3) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching tabs from port {port}: {e}")
        return []

def send_cdp(ws, method, params=None, msg_id=1):
    msg = {"id": msg_id, "method": method, "params": params or {}}
    ws.send(json.dumps(msg))
    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == msg_id:
            return resp

def capture_tab_screenshot(ws, output_path):
    send_cdp(ws, "Page.enable", msg_id=10)
    res = send_cdp(ws, "Page.captureScreenshot", {"format": "png"}, msg_id=11)
    if "result" in res and "data" in res["result"]:
        img_bytes = base64.b64decode(res["result"]["data"])
        with open(output_path, "wb") as f:
            f.write(img_bytes)
        print(f"Screenshot saved to: {output_path}")
        return True
    else:
        print(f"Failed to capture screenshot: {res}")
        return False

def eval_js(ws, expr, msg_id=20):
    res = send_cdp(ws, "Runtime.evaluate", {
        "expression": expr,
        "returnByValue": True,
        "awaitPromise": True
    }, msg_id=msg_id)
    if "result" in res and "result" in res["result"]:
        return res["result"]["result"].get("value")
    return res

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9222
    tabs = get_tabs(port)
    print(f"Found {len(tabs)} tabs:")
    for t in tabs:
        print(f"  [{t.get('type')}] {t.get('title')} ({t.get('url')})")
