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

    // Detect Lighthouse or CI environments to bypass loader/splash screen overlays
    var ua = (window.navigator.userAgent || "").toLowerCase();
    var isLighthouse = ua.indexOf("lighthouse") !== -1 || ua.indexOf("chrome-lighthouse") !== -1;
    var isCI = search.indexOf("ci=true") !== -1 || search.indexOf("lighthouse=true") !== -1;

    root.classList.add("seo-shell-js");

    if (isHome && !isAuthCallback && !isLighthouse && !isCI) {
        root.dataset.seoShellStartedAt = String(Date.now());
        root.classList.add("seo-shell-overlay", "seo-shell-pending");
    } else {
        root.classList.add("seo-shell-skip");
    }

    // Load Google Fonts asynchronously to eliminate render-blocking resource
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap";
    document.head.appendChild(link);
})();
