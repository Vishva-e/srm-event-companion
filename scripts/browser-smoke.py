#!/usr/bin/env python3
"""Exercise the running demo in headless Chrome using the DevTools protocol.

Usage: python3 scripts/browser-smoke.py [http://localhost:8080] [--chrome PATH]
Requires Chrome/Chromium and the Python websocket-client package. The server
must already be running. Only fake demo accounts and a temporary profile are used.
"""

import argparse
import base64
from contextlib import contextmanager
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen

try:
    import websocket
except ImportError:
    sys.exit("Missing websocket-client. Install it with: python3 -m pip install websocket-client")


class Browser:
    """Small synchronous CDP client; events may arrive between command replies."""

    def __init__(self, address, timeout=30, screenshots=None):
        self.socket = websocket.create_connection(address, timeout=timeout, suppress_origin=True)
        self.timeout = timeout
        self.screenshots = screenshots
        self.sequence = 0
        self.exceptions = []
        self.checks = 0
        self.call("Page.enable")
        self.call("Runtime.enable")
        self.call("Network.enable")
        # Exercise the local app with its system-font fallback, without CDN delays.
        self.call("Network.setBlockedURLs", urls=["https://fonts.googleapis.com/*", "https://fonts.gstatic.com/*"])

    def call(self, method, **params):
        self.sequence += 1
        request_id = self.sequence
        self.socket.send(json.dumps({"id": request_id, "method": method, "params": params}))
        while True:
            message = json.loads(self.socket.recv())
            if message.get("method") == "Runtime.exceptionThrown":
                self.exceptions.append(message["params"]["exceptionDetails"])
            if message.get("id") != request_id:
                continue
            if "error" in message:
                raise RuntimeError(f"{method}: {message['error']}")
            return message.get("result", {})

    def evaluate(self, expression):
        result = self.call("Runtime.evaluate", expression=expression,
                           returnByValue=True, awaitPromise=True)
        if "exceptionDetails" in result:
            raise AssertionError(f"JavaScript evaluation failed: {result['exceptionDetails']}")
        return result.get("result", {}).get("value")

    def wait(self, expression, description, timeout=None):
        deadline = time.monotonic() + (timeout or self.timeout)
        while time.monotonic() < deadline:
            try:
                if self.evaluate(expression):
                    return
            except RuntimeError as error:
                # Chrome can replace its JavaScript context during navigation.
                if "context" not in str(error).lower():
                    raise
            time.sleep(0.05)
        raise AssertionError(f"Timed out waiting for {description}")

    def check(self, expression, description):
        if not self.evaluate(expression):
            raise AssertionError(description)
        self.checks += 1

    def click(self, selector):
        self.evaluate(f"document.querySelector({json.dumps(selector)}).click()")

    def type(self, selector, value):
        self.evaluate("(() => { const input = document.querySelector("
                      + json.dumps(selector) + "); input.value = " + json.dumps(value)
                      + "; input.dispatchEvent(new Event('input', {bubbles: true})); })()")

    def reload(self, ready, description):
        self.evaluate("window.__smokeReloadMarker = true")
        self.call("Page.reload")
        self.wait("!window.__smokeReloadMarker && document.readyState === 'complete' && " + ready,
                  description)

    def screenshot(self, name):
        if self.screenshots is None:
            return
        self.evaluate("document.fonts.ready.then(() => true)")
        size = self.call("Page.getLayoutMetrics")["cssContentSize"]
        result = self.call("Page.captureScreenshot", format="png", captureBeyondViewport=True,
                           clip={"x": 0, "y": 0, "width": size["width"], "height": size["height"], "scale": 1})
        self.screenshots.mkdir(parents=True, exist_ok=True)
        (self.screenshots / f"{name}.png").write_bytes(base64.b64decode(result["data"]))

    def close(self):
        self.socket.close()


@contextmanager
def launch_browser(chrome, timeout=30, screenshots=None):
    with tempfile.TemporaryDirectory(prefix="srm-browser-smoke-", ignore_cleanup_errors=True) as directory:
        profile = Path(directory)
        with (profile / "chrome.log").open("w+") as log:
            process = subprocess.Popen([
                chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
                "--no-first-run", "--no-default-browser-check", "--window-size=1440,1000",
                "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0",
                f"--user-data-dir={profile / 'profile'}", "about:blank",
            ], stdout=log, stderr=subprocess.STDOUT)
            browser = None
            try:
                port_file = profile / "profile" / "DevToolsActivePort"
                deadline = time.monotonic() + 60
                while not port_file.exists():
                    if process.poll() is not None or time.monotonic() >= deadline:
                        log.seek(0)
                        status = process.poll()
                        reason = f"exited with code {status}" if status is not None else "DevTools was not ready after 60 seconds"
                        raise RuntimeError(f"Browser startup failed: {chrome} (PID {process.pid}), {reason}.\n"
                                           f"{log.read()[-4000:] or '(No browser log output.)'}")
                    time.sleep(0.1)
                port = port_file.read_text().splitlines()[0]
                with urlopen(f"http://127.0.0.1:{port}/json/list", timeout=timeout) as response:
                    targets = json.load(response)
                page = next(target for target in targets if target["type"] == "page")
                browser = Browser(page["webSocketDebuggerUrl"], timeout, screenshots)
                browser.call("Emulation.setDeviceMetricsOverride", width=1440, height=1000,
                             deviceScaleFactor=1, mobile=False)
                yield browser
            finally:
                if browser:
                    try:
                        browser.close()
                    except (OSError, websocket.WebSocketException) as error:
                        print(f"WARNING: Could not close browser connection: {error}", file=sys.stderr)
                for action in ("terminate", "kill"):
                    if process.poll() is not None:
                        break
                    try:
                        getattr(process, action)()
                        process.wait(timeout=5)
                        break
                    except subprocess.TimeoutExpired:
                        if action == "kill":
                            print(f"WARNING: Browser PID {process.pid} did not exit after terminate/kill; "
                                  "its process state may require inspection.", file=sys.stderr)
                    except OSError as error:
                        print(f"WARNING: Could not {action} browser PID {process.pid}: {error}", file=sys.stderr)


def fetch_rules(rules):
    """Hold/reject selected requests once, while other requests use real HTTP."""
    return """(() => {
      window.__smokeNativeFetch ||= window.fetch.bind(window);
      const rules = RULES.map(rule => ({remaining: 1, ...rule}));
      const state = window.__smoke = {pending: [], requests: []};
      window.fetch = (input, options = {}) => {
        const path = new URL(typeof input === 'string' ? input : input.url, location.href).pathname;
        const method = (options.method || 'GET').toUpperCase();
        state.requests.push({path, method});
        const rule = rules.find(item => item.remaining > 0 && item.path === path && item.method === method);
        if (!rule) return window.__smokeNativeFetch(input, options);
        rule.remaining--;
        if (rule.effect === 'reject') return Promise.reject(new TypeError('Simulated smoke-test network failure'));
        return new Promise((resolve, reject) => state.pending.push(() =>
          window.__smokeNativeFetch(input, options).then(resolve, reject)));
      };
    })()""".replace("RULES", json.dumps(rules))


LOGIN_READY = "document.querySelector('#login-form')?.getAttribute('aria-busy') === 'false' && !document.querySelector('#login-screen').hidden"
APP_READY = "!document.querySelector('#app-shell').hidden && document.querySelector('#login-form').getAttribute('aria-busy') === 'false'"
VISIBLE_ITEMS = "Array.from(document.querySelectorAll('.menu-card')).filter(card => !card.hidden)"
ACCOUNTS = [
    ("SRM2026001", "Vishva", "E07", "02", "03"),
    ("SRM2026002", "Sanjana", "C04", "01", "01"),
    ("SRM2026003", "Arun", "F02", "03", "02"),
]


def start_login(browser, student_id, username):
    browser.type("#student-id", student_id)
    browser.type("#username", username)
    browser.click(".login-submit")


def check_profile(browser, name, seat, gate, counter):
    expected = json.dumps([name, seat, gate, counter])
    browser.check("JSON.stringify([document.querySelector('#welcome-name').textContent, "
                  "...Array.from(document.querySelectorAll('.ticket-stats strong')).map(node => node.textContent)])"
                  f" === JSON.stringify({expected})", f"Personalized pass for {name}")
    browser.check(f"document.querySelector('#sidebar-event-location').textContent.includes('Gate {gate}') && "
                  f"document.querySelector('.theatre-hint').textContent.includes('Gate {gate}') && "
                  f"document.querySelector('.counter-nearby-text').textContent.includes('Gate {gate}') && "
                  f"document.querySelector('.counter-display > b').textContent === '{counter}' && "
                  f"document.querySelector('.seat-badge').textContent === '{seat}'",
                  f"All gate, seat and counter labels agree for {name}")


def check_account(browser, account, capture=False):
    _, name, seat, gate, counter = account
    browser.wait(APP_READY, f"{name}'s event pass")
    check_profile(browser, name, seat, gate, counter)
    if capture:
        browser.screenshot("desktop-dashboard")
    browser.check("document.querySelector('#menu-search').value === '' && "
                  "document.querySelector('[data-filter=all]').getAttribute('aria-pressed') === 'true' && "
                  f"{VISIBLE_ITEMS}.length === 4", "New accounts start with all menu items and empty search")

    browser.click('.side-nav [data-go="seat"]')
    browser.check("location.hash === '#seat' && !document.querySelector('#view-seat').hidden",
                  "Seat navigation updates route and view")
    if capture:
        browser.screenshot("desktop-seat")
    browser.check("document.querySelectorAll('#seat-rows [data-seat]').length === 63 && "
                  "new Set(Array.from(document.querySelectorAll('[data-seat]')).map(node => node.dataset.seat)).size === 63 && "
                  "document.querySelectorAll('.seat-assigned').length === 1 && "
                  f"document.querySelector('.seat-assigned').dataset.seat === '{seat}' && "
                  "document.querySelector('.seat-assigned').getAttribute('aria-current') === 'location' && "
                  "Array.from(document.querySelectorAll('.seat-occupied')).every(node => node.disabled)",
                  "63 unique seats, one assigned seat, and disabled occupied seats")
    browser.click(".seat-free")
    browser.check(f"document.querySelector('#seat-notice').textContent.includes('remains {seat}')",
                  "Clicking another seat cannot change the assignment")
    browser.click("#locate-seat")
    browser.check(f"document.activeElement.dataset.seat === '{seat}' && "
                  f"document.querySelector('#seat-notice').textContent.includes('{seat}')",
                  "Locate button focuses and announces the assigned seat")

    browser.click('.side-nav [data-go="food"]')
    if capture:
        browser.screenshot("desktop-food")
    browser.evaluate("history.back()")
    browser.wait("location.hash === '#seat' && !document.querySelector('#view-seat').hidden",
                 "back navigation to seating")
    browser.evaluate("history.forward()")
    browser.wait("location.hash === '#food' && !document.querySelector('#view-food').hidden",
                 "forward navigation to food")
    for category, count in [("meals", 2), ("snacks", 1), ("drinks", 1), ("all", 4)]:
        browser.click(f'[data-filter="{category}"]')
        browser.check(f"{VISIBLE_ITEMS}.length === {count} && "
                      f"document.querySelector('[data-filter={category}]').getAttribute('aria-pressed') === 'true'",
                      f"{category} menu filter")
    browser.type("#menu-search", "  LIME  ")
    browser.check(f"{VISIBLE_ITEMS}.length === 1 && {VISIBLE_ITEMS}[0].textContent.includes('Fresh lime juice')",
                  "Search ignores case and surrounding spaces")
    browser.type("#menu-search", "item-that-does-not-exist")
    browser.check(f"{VISIBLE_ITEMS}.length === 0 && !document.querySelector('#menu-empty').hidden && "
                  "document.querySelector('#menu-results').textContent.includes('0 menu items')",
                  "Empty search results are visible and announced")
    browser.type("#menu-search", "")
    browser.check(f"{VISIBLE_ITEMS}.length === 4 && document.querySelector('#menu-empty').hidden",
                  "Clearing search restores all menu items")
    browser.evaluate("location.hash = '#unknown'")
    browser.wait("location.hash === '#home' && !document.querySelector('#view-home').hidden",
                 "invalid route normalization")
    browser.evaluate("location.hash = '#food'")
    browser.wait("!document.querySelector('#view-food').hidden", "direct hash navigation")
    browser.reload(APP_READY, "session restoration after refresh")
    browser.check("location.hash === '#food' && !document.querySelector('#view-food').hidden",
                  "Refresh preserves the current route")
    check_profile(browser, name, seat, gate, counter)
    # Leave stale filter/search state to test the next account's reset.
    browser.click('[data-filter="drinks"]')
    browser.type("#menu-search", "no-results")
    browser.click(".logout-btn")
    browser.wait(LOGIN_READY, "successful sign out")
    browser.check("document.querySelector('#app-shell').hidden && location.hash === '' && "
                  "document.title.includes('Event Access') && document.querySelector('#student-id').value === ''",
                  "Logout clears the visible pass, route and credentials")
    print(f"PASS: {name} login, personalized pass, seats, menu, routes, refresh and logout", flush=True)


def check_mobile_and_session_recovery(browser):
    browser.call("Emulation.setDeviceMetricsOverride", width=390, height=844,
                 deviceScaleFactor=1, mobile=True)
    browser.call("Emulation.setTouchEmulationEnabled", enabled=True, maxTouchPoints=1)
    no_overflow = "document.documentElement.clientWidth === 390 && document.documentElement.scrollWidth <= 390 && document.body.scrollWidth <= 390"
    browser.check(no_overflow, "Mobile login has no document horizontal overflow")
    browser.screenshot("mobile-login")
    start_login(browser, *ACCOUNTS[0][:2])
    browser.wait(APP_READY, "mobile sign-in")
    browser.check("getComputedStyle(document.querySelector('.mobile-nav')).display !== 'none' && "
                  "getComputedStyle(document.querySelector('.mobile-signout')).display !== 'none'",
                  "Mobile navigation and sign-out controls are visible")
    for route, filename in [("home", "dashboard"), ("seat", "seat"), ("food", "food")]:
        browser.click(f'.mobile-nav [data-go="{route}"]')
        browser.check(f"location.hash === '#{route}' && !document.querySelector('#view-{route}').hidden && "
                      f"document.querySelector('.mobile-nav [data-go={route}]').getAttribute('aria-current') === 'page'",
                      f"Mobile navigation opens {route}")
        browser.check(no_overflow, f"Mobile {route} has no document horizontal overflow")
        browser.screenshot(f"mobile-{filename}")

    browser.check("fetch('/api/session', {method: 'DELETE'}).then(response => response.status === 204)",
                  "The session can be expired independently of visible UI")
    browser.reload(LOGIN_READY, "expired-session restoration")
    browser.check("document.querySelector('#app-shell').hidden && location.hash === '#food' && "
                  "document.querySelector('#retry-session').hidden && !document.querySelector('#login-error').textContent",
                  "An expired session hides the pass and returns to login without a network-error retry")

    start_login(browser, *ACCOUNTS[0][:2])
    browser.wait(APP_READY, "sign-in after expiration")
    script = browser.call("Page.addScriptToEvaluateOnNewDocument", source=fetch_rules([
        {"path": "/api/session", "method": "GET", "effect": "reject"},
    ]))["identifier"]
    browser.reload(LOGIN_READY, "offline startup")
    browser.check("document.querySelector('#app-shell').hidden && !document.querySelector('#retry-session').hidden && "
                  "document.querySelector('#login-error').textContent.includes('Unable to connect')",
                  "Offline startup shows a recoverable connection error")
    browser.call("Page.removeScriptToEvaluateOnNewDocument", identifier=script)
    browser.click("#retry-session")
    browser.wait(APP_READY, "offline startup retry")
    check_profile(browser, *ACCOUNTS[0][1:])
    browser.click(".mobile-signout")
    browser.wait(LOGIN_READY, "mobile sign-out")
    browser.check("document.querySelector('#app-shell').hidden && location.hash === ''",
                  "Mobile sign-out clears the pass and route")
    print("PASS: mobile layout/navigation/sign-out, expired session and offline startup retry", flush=True)


def run(browser, base_url):
    # The first session request is held before app.js runs, making the race deterministic.
    script = browser.call("Page.addScriptToEvaluateOnNewDocument", source=fetch_rules([
        {"path": "/api/session", "method": "GET", "effect": "hold"},
    ]))["identifier"]
    browser.call("Page.navigate", url=base_url.rstrip("/") + "/")
    browser.wait("window.__smoke?.pending.length === 1", "delayed initial session request")
    browser.check("document.querySelector('#app-shell').hidden && "
                  "Array.from(document.querySelector('#login-form').elements).every(input => input.disabled) && "
                  "document.querySelector('#demo-fill').disabled", "Bootstrap disables login until session check completes")
    browser.evaluate("document.querySelector('#login-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}))")
    browser.check("!window.__smoke.requests.some(request => request.method === 'POST')",
                  "Submitting during bootstrap cannot start a competing sign-in")
    browser.evaluate("window.__smoke.pending.splice(0).forEach(release => release())")
    browser.wait(LOGIN_READY, "initial session check completion")
    browser.call("Page.removeScriptToEvaluateOnNewDocument", identifier=script)
    browser.screenshot("desktop-login")

    browser.click(".login-submit")
    browser.check("document.querySelector('#login-error').textContent.length > 0 && document.activeElement.id === 'student-id'",
                  "Empty credentials show accessible validation")
    start_login(browser, "SRM2026001", "wrong-user")
    browser.wait(LOGIN_READY, "rejected credentials")
    browser.check("document.querySelector('#login-error').textContent.length > 0 && document.querySelector('#app-shell').hidden",
                  "Invalid credentials keep the login screen visible")

    for index, account in enumerate(ACCOUNTS):
        if index == 0:
            browser.evaluate(fetch_rules([{"path": "/api/menu", "method": "GET", "effect": "hold"}]))
        start_login(browser, account[0], account[1])
        if index == 0:
            browser.wait("window.__smoke.pending.length === 1", "delayed menu response")
            browser.check("document.querySelector('#app-shell').hidden && document.querySelector('.login-submit').disabled",
                          "The pass stays hidden until menu and seat data are ready")
            browser.evaluate("document.querySelector('#login-form').dispatchEvent(new Event('submit', {cancelable: true}))")
            browser.check("window.__smoke.requests.filter(request => request.method === 'POST').length === 1",
                          "Duplicate submissions do not create another session")
            browser.evaluate("window.__smoke.pending.splice(0).forEach(release => release())")
        check_account(browser, account, capture=index == 0)

    browser.evaluate(fetch_rules([{"path": "/api/menu", "method": "GET", "effect": "reject"}]))
    start_login(browser, *ACCOUNTS[0][:2])
    browser.wait(LOGIN_READY, "failed menu load")
    browser.check("document.querySelector('#app-shell').hidden && !document.querySelector('#retry-session').hidden && "
                  "document.querySelector('#login-error').textContent.includes('could not load')",
                  "Failed menu load keeps the pass hidden and offers recovery")
    browser.click("#retry-session")
    browser.wait(APP_READY, "retry recovering the existing session")
    check_profile(browser, *ACCOUNTS[0][1:])

    browser.evaluate(fetch_rules([{"path": "/api/session", "method": "DELETE", "effect": "reject"}]))
    browser.click(".logout-btn")
    browser.wait("document.querySelector('#app-error').textContent.length > 0 && " + APP_READY,
                 "failed logout notification")
    browser.check("document.querySelector('#login-screen').hidden && !document.querySelector('.logout-btn').disabled && "
                  "document.querySelector('#app-error').textContent.includes('Sign out could not be confirmed')",
                  "Failed logout retains the pass, shows an error and enables retry")
    browser.reload(APP_READY, "session retained after failed logout")
    check_profile(browser, *ACCOUNTS[0][1:])
    browser.click(".logout-btn")
    browser.wait(LOGIN_READY, "logout retry")
    browser.reload(LOGIN_READY, "signed-out refresh")
    browser.check("document.querySelector('#app-shell').hidden", "Successful logout remains signed out after refresh")
    check_mobile_and_session_recovery(browser)
    if browser.exceptions:
        raise AssertionError(f"Uncaught browser exceptions: {browser.exceptions}")
    print(f"PASS: delayed requests, duplicate submits, failed menu/logout recovery; {browser.checks} assertions", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", nargs="?", default="http://localhost:8080")
    parser.add_argument("--chrome", default=shutil.which("google-chrome") or shutil.which("chromium")
                        or "/opt/google/chrome/chrome")
    parser.add_argument("--timeout", type=float, default=30, help="CDP command and condition timeout in seconds (default: 30)")
    parser.add_argument("--screenshots", type=Path, help="Save desktop/mobile login, dashboard, seat and food PNGs here")
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be greater than zero")
    try:
        with launch_browser(args.chrome, args.timeout, args.screenshots) as browser:
            run(browser, args.base_url)
    except (AssertionError, OSError, RuntimeError, websocket.WebSocketException) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
