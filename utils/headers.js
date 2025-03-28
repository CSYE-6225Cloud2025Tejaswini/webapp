const setCommonHeaders = (res) => {
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
};

module.exports = {
  setCommonHeaders,
};
