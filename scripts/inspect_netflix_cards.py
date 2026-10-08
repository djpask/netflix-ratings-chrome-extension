import json
import urllib.request
import websocket

tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9222/json').read())
tab = [t for t in tabs if t.get('type') == 'page' and 'netflix' in t.get('url', '')][0]
ws = websocket.create_connection(tab['webSocketDebuggerUrl'])

def send(method, params=None, msg_id=1):
    ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
    while True:
        r = json.loads(ws.recv())
        if r.get('id') == msg_id:
            return r

inspect_js = """
(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const matched = [];
    
    for (const el of all) {
        const aria = el.getAttribute('aria-label') || '';
        const title = el.getAttribute('title') || '';
        const href = el.getAttribute('href') || '';
        const dataUia = el.getAttribute('data-uia') || '';
        
        if (aria.includes('Mute') || aria.includes('Equilibrium') || aria.includes('Titani') || href.includes('80119233')) {
            matched.push({
                tagName: el.tagName,
                className: el.className,
                ariaLabel: aria,
                href: href,
                dataUia: dataUia,
                parentTag: el.parentElement ? el.parentElement.tagName : null,
                parentClass: el.parentElement ? el.parentElement.className : null,
                grandParentClass: el.parentElement && el.parentElement.parentElement ? el.parentElement.parentElement.className : null,
                outerSnippet: el.outerHTML.slice(0, 350)
            });
        }
    }
    return matched;
})()
"""

res = send('Runtime.evaluate', {'expression': inspect_js, 'returnByValue': True}, msg_id=1)
val = res.get('result', {}).get('result', {}).get('value', [])
print(f"Matched {len(val)} elements:")
for item in val:
    print(json.dumps(item, indent=2))
