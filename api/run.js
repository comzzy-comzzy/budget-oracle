const { runPayload } = require("../demo/site/handler.js");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    response.status(405).json({ success: false, error: "Method not allowed." });
    return;
  }

  try {
    response.status(200).json(await runPayload(request.body));
  } catch (error) {
    response.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
