import json
import urllib.request
import websocket
import base64
import time

tabs = json.loads(urllib.request.urlopen("http://127.0.0.1:9222/json").read())
tab = [t for t in tabs if t.get("type") == "page" and "netflix" in t.get("url", "")][0]
ws = websocket.create_connection(tab["webSocketDebuggerUrl"])

def send(method, params=None, msg_id=1):
    ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
    while True:
        r = json.loads(ws.recv())
        if r.get("id") == msg_id: return r

print("1. Enabling Page and Runtime...")
send("Page.enable", msg_id=1)
send("Runtime.enable", msg_id=2)

print("2. Reloading Netflix page...")
send("Page.reload", msg_id=3)

print("3. Waiting 6 seconds for feed and ratings to load...")
time.sleep(6)

print("4. Inspecting injected badges in the DOM...")
inspect_js = """
(() => {
    const badges = document.querySelectorAll('.flixratings-card-badge');
    const results = [];
    badges.forEach(b => {
        results.push({
            title: b.title,
            ratingText: b.textContent.trim(),
            parentAria: b.parentElement ? b.parentElement.getAttribute('aria-label') : null,
            parentHref: b.parentElement ? b.parentElement.getAttribute('href') : null
        });
    });
    return {
        badgeCount: badges.length,
        badges: results.slice(0, 15)
    };
})()
"""

res = send("Runtime.evaluate", {"expression": inspect_js, "returnByValue": True}, msg_id=4)
val = res.get("result", {}).get("result", {}).get("value", {})
print(f"Total badges found: {val.get('badgeCount', 0)}")
for b in val.get("badges", []):
    print(f"  -> Title: \"{b.get('parentAria')}\" | Badge: \"{b.get('ratingText')}\" | Tooltip: {b.get('title')[:60]}")

print("5. Capturing initial view screenshot...")
snap1 = send("Page.captureScreenshot", {"format": "png"}, msg_id=5)
data1 = base64.b64decode(snap1["result"]["data"])
path1 = "/home/pask/.gemini/antigravity-ide/brain/80f5e391-2639-41de-a912-27185d05c1b0/verified_feed_top.png"
with open(path1, "wb") as f:
    f.write(data1)
print(f"Screenshot 1 saved to: {path1}")

print("6. Scrolling down to capture rows...")
send("Runtime.evaluate", {"expression": "window.scrollBy(0, 650);"}, msg_id=6)
time.sleep(2)

snap2 = send("Page.captureScreenshot", {"format": "png"}, msg_id=7)
data2 = base64.b64decode(snap2["result"]["data"])
path2 = "/home/pask/.gemini/antigravity-ide/brain/80f5e391-2639-41de-a912-27185d05c1b0/verified_feed_rows.png"
with open(path2, "wb") as f:
    f.write(data2)
print(f"Screenshot 2 saved to: {path2}")
