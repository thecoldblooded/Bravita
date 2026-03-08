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

    root.classList.add("seo-shell-js");

    if (isHome && !isAuthCallback) {
        root.dataset.seoShellStartedAt = String(Date.now());
        root.classList.add("seo-shell-overlay", "seo-shell-pending");
    } else {
        root.classList.add("seo-shell-skip");
    }
})();
