// Utility to set security and caching headers on all HTTP responses
const setCommonHeaders = (res) => {
  res.set({
    // Prevent caching on client and proxies
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",

    // Prevent MIME-type sniffing
    "X-Content-Type-Options": "nosniff",
  });
};

module.exports = {
  setCommonHeaders,
};
