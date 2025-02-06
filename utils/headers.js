const applyHeaders = (response) => {
    response.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
  };
   
  module.exports = {
    applyHeaders,
  };