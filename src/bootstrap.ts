const startApp = () => {
  void import("./main.tsx");
};

if (typeof globalThis.requestAnimationFrame === "function") {
  globalThis.requestAnimationFrame(startApp);
} else {
  globalThis.setTimeout(startApp, 0);
}
