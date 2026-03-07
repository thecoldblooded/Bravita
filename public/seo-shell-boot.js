(function () {
    var root = document.documentElement;
    var path = window.location.pathname || "/";

    if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
    }

    var isHome = path === "/" || path === "/index.html";

    root.classList.add("seo-shell-js");

    if (isHome) {
        root.dataset.seoShellStartedAt = String(Date.now());
        root.classList.add("seo-shell-overlay", "seo-shell-pending");
    } else {
        root.classList.add("seo-shell-skip");
    }
})();
