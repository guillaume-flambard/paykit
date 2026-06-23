/* PayKit embed — drop-in credits, metering & paywall for ANY website.
 *
 *   <div id="paykit"></div>
 *   <script src="https://your-paykit.app/embed.js" data-key="pk_live_..."></script>
 *
 * No build step, no framework. Optional attributes on the <script> tag:
 *   data-key     your publishable key (identifies your project)
 *   data-user    your logged-in user's id (omit → a per-browser id is used)
 *   data-accent  brand colour (default emerald #34d399)
 *   data-base    API origin (default: where this script is served from)
 *
 * Anywhere on the page you can also add:
 *   <button data-paykit-meter="image_gen">Generate</button>   → spends 1 credit on click
 *   <div data-paykit-plan="pro"> Pro-only content </div>       → hidden unless the user is Pro
 *
 * And in your own code: PayKit.meter('image_gen'), PayKit.buy(), PayKit.refresh().
 */
(function () {
  "use strict"

  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script")
      return s[s.length - 1]
    })()

  var base = script.getAttribute("data-base") || new URL(script.src).origin
  var key = script.getAttribute("data-key") || ""
  var accent = script.getAttribute("data-accent") || "#34d399"
  var explicitUser = script.getAttribute("data-user")

  function userId() {
    if (explicitUser) return explicitUser
    try {
      var u = localStorage.getItem("paykit_uid")
      if (!u) {
        u = "web_" + Math.random().toString(36).slice(2, 10)
        localStorage.setItem("paykit_uid", u)
      }
      return u
    } catch (e) {
      return "web_anon"
    }
  }
  var user = userId()
  var account = null

  function api(path, opts) {
    return fetch(base + "/api/v1" + path, opts).then(function (r) {
      return r.json()
    })
  }

  function refresh() {
    return api("/access?userId=" + encodeURIComponent(user) + "&key=" + encodeURIComponent(key)).then(function (a) {
      account = a
      paint()
      return a
    })
  }

  function meter(event) {
    return api("/meter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user, event: event || "usage", key: key }),
    }).then(function (r) {
      refresh()
      return r
    })
  }

  function buy() {
    return api("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user, kind: "credits", key: key }),
    }).then(function (r) {
      if (r && r.url) window.location.href = r.url
      else alert("Buying credits isn't set up yet (no Stripe key).")
    })
  }

  function host() {
    var el = document.getElementById("paykit")
    if (!el) {
      el = document.createElement("div")
      el.id = "paykit"
      document.body.appendChild(el)
    }
    return el
  }

  function paint() {
    if (!account) return
    var el = host()
    if (account.error || typeof account.credits !== "number") {
      el.innerHTML =
        '<div style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:#0c0c0e;' +
        'border:1px solid #3a1d1d;color:#fca5a5;font-family:system-ui,-apple-system,sans-serif;font-size:13px">' +
        "PayKit: " +
        (account.error || "unavailable") +
        " — check your data-key</div>"
      return
    }
    var pro = (account.entitlements || []).indexOf("pro") >= 0
    el.innerHTML =
      '<div style="display:inline-flex;align-items:center;gap:14px;padding:12px 16px;border-radius:14px;' +
      "background:#0c0c0e;border:1px solid #1f1f23;color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;" +
      'box-shadow:0 10px 30px -16px rgba(0,0,0,.7)">' +
      '<div style="display:flex;align-items:center;gap:8px">' +
      '<span style="width:22px;height:22px;border-radius:6px;background:' +
      accent +
      ';display:inline-flex;align-items:center;justify-content:center;color:#06120c;font-weight:800;font-size:13px">⚡</span>' +
      '<div style="line-height:1.1"><div style="font-size:18px;font-weight:700;color:#fafafa">' +
      account.credits +
      '</div><div style="font-size:11px;color:#76767e">credits left</div></div></div>' +
      (pro
        ? '<span style="font-size:11px;font-weight:600;color:' +
          accent +
          ";background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);border-radius:999px;padding:3px 9px\">Pro</span>"
        : "") +
      '<button data-pk-buy style="padding:9px 14px;border-radius:10px;background:' +
      accent +
      ';color:#06120c;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit">Buy credits</button>' +
      '<a href="https://github.com/guillaume-flambard/paykit" target="_blank" rel="noopener" style="font-size:10px;color:#5b5b63;text-decoration:none">Powered by PayKit</a>' +
      "</div>"

    var b = el.querySelector("[data-pk-buy]")
    if (b) b.onclick = buy

    // Paywall: hide elements gated by a plan the user doesn't have.
    document.querySelectorAll("[data-paykit-plan]").forEach(function (node) {
      var plan = node.getAttribute("data-paykit-plan")
      var ok = plan === "free" || (account.entitlements || []).indexOf(plan) >= 0
      node.style.display = ok ? "" : "none"
    })
  }

  // Wire any element that opts into metering on click.
  function wireMeters() {
    document.querySelectorAll("[data-paykit-meter]").forEach(function (node) {
      if (node.__paykitWired) return
      node.__paykitWired = true
      node.addEventListener("click", function () {
        meter(node.getAttribute("data-paykit-meter")).then(function (r) {
          if (r && r.blocked) buy()
        })
      })
    })
  }

  window.PayKit = {
    user: user,
    meter: meter,
    buy: buy,
    refresh: refresh,
    account: function () {
      return account
    },
  }

  function init() {
    refresh()
    wireMeters()
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()
