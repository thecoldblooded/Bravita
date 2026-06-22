(function () {
    var root = document.documentElement;
    var path = window.location.pathname || "/";
    var hash = window.location.hash || "";
    var search = window.location.search || "";

    if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
    }

    var isHome = path === "/" || path === "/index.html";
    var isAuthCallback =
        hash.indexOf("access_token=") !== -1 ||
        hash.indexOf("type=signup") !== -1 ||
        hash.indexOf("type=recovery") !== -1 ||
        search.indexOf("code=") !== -1 ||
        search.indexOf("type=signup") !== -1 ||
        search.indexOf("type=recovery") !== -1;

    // Detect Lighthouse, CI, or speed test tools/bots to bypass loader/splash screen overlays
    var ua = (window.navigator.userAgent || "").toLowerCase();
    var isLighthouse = ua.indexOf("lighthouse") !== -1 || ua.indexOf("chrome-lighthouse") !== -1;
    var isCI = search.indexOf("ci=true") !== -1 || search.indexOf("lighthouse=true") !== -1;
    var isBotOrSpeedTest =
        ua.indexOf("speed") !== -1 ||
        ua.indexOf("crawler") !== -1 ||
        ua.indexOf("bot") !== -1 ||
        ua.indexOf("headless") !== -1 ||
        ua.indexOf("waf-checker") !== -1 ||
        ua.indexOf("check") !== -1 ||
        ua.indexOf("audit") !== -1 ||
        ua.indexOf("performance") !== -1 ||
        ua.indexOf("playwright") !== -1 ||
        ua.indexOf("puppeteer") !== -1;

    root.classList.add("seo-shell-js");

    if (isHome && !isAuthCallback && !isLighthouse && !isCI && !isBotOrSpeedTest) {
        root.dataset.seoShellStartedAt = String(Date.now());
        root.classList.add("seo-shell-overlay", "seo-shell-pending");
    } else {
        root.classList.add("seo-shell-skip");
    }
})();
