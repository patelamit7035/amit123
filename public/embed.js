/**
 * FunnelOS embeddable lead form.
 *
 * Paste this on any landing page - WordPress, Webflow, Shopify, a raw HTML
 * file, anywhere:
 *
 *   <div id="funnelos-form-RH7K2M4P"></div>
 *   <script src="https://your-app.example.com/embed.js"
 *           data-funnelos-ref="RH7K2M4P"
 *           data-funnelos-base="https://your-app.example.com" async></script>
 *
 * Every submission is attributed to the affiliate who owns that referral code.
 */
(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i -= 1) {
      if (all[i].getAttribute("data-funnelos-ref")) {
        script = all[i];
        break;
      }
    }
  }
  if (!script) return;

  var code = (script.getAttribute("data-funnelos-ref") || "").trim().toUpperCase();
  if (!code) return;

  var base = (script.getAttribute("data-funnelos-base") || script.src.replace(/\/embed\.js.*$/, "")).replace(/\/+$/, "");
  var target =
    document.getElementById("funnelos-form-" + code) ||
    (function () {
      var holder = document.createElement("div");
      script.parentNode.insertBefore(holder, script);
      return holder;
    })();

  var iframe = document.createElement("iframe");
  iframe.src =
    base + "/#/embed/" + encodeURIComponent(code) + "?source=" + encodeURIComponent(location.href.slice(0, 180));
  iframe.title = "Lead form";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.height = (script.getAttribute("data-funnelos-height") || "480") + "px";
  iframe.style.colorScheme = "normal";
  target.appendChild(iframe);

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "funnelos:resize" || data.code !== code) return;
    var height = parseInt(data.height, 10);
    if (height > 0 && height < 4000) iframe.style.height = height + "px";
  });
})();
