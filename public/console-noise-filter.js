(function () {
    if (typeof window === "undefined" || typeof console === "undefined") {
        return;
    }

    if (window.__bravitaConsoleNoiseFilterInstalled) {
        return;
    }

    window.__bravitaConsoleNoiseFilterInstalled = true;

    function hasWalletGuardFields(value) {
        if (!value || typeof value !== "object") {
            return false;
        }

        var name = typeof value.name === "string" ? value.name : "";
        var component = typeof value.component === "string" ? value.component : "";
        var msg = typeof value.msg === "string" ? value.msg : "";

        return /walletguard/i.test(name) || /walletguard/i.test(component) || /walletguard/i.test(msg);
    }

    function shouldFilter(args) {
        if (!Array.isArray(args) || args.length === 0) {
            return false;
        }

        var combinedText = args
            .filter(function (arg) {
                return typeof arg === "string";
            })
            .join(" ");

        if (/\[vite\]\s+connecting/i.test(combinedText)) {
            return true;
        }

        if (/\[vite\]\s+connected/i.test(combinedText)) {
            return true;
        }

        if (/walletguard/i.test(combinedText)) {
            return true;
        }

        return args.some(hasWalletGuardFields);
    }

    ["debug", "info", "log", "warn"].forEach(function (method) {
        var original = console[method];

        if (typeof original !== "function") {
            return;
        }

        var boundOriginal = original.bind(console);

        console[method] = function () {
            var args = Array.prototype.slice.call(arguments);

            if (shouldFilter(args)) {
                return;
            }

            boundOriginal.apply(console, args);
        };
    });
})();
