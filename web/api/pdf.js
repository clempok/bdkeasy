const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { html, title } = req.body || {};
    if (!html) {
      res.status(400).json({ error: "Missing html" });
      return;
    }

    const executablePath = await chromium.executablePath();
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    await browser.close();

    const safeTitle = String(title || "bilan")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeTitle || "bilan"}.pdf"`
    );
    res.status(200).send(pdf);
  } catch (error) {
    res.status(500).json({ error: "PDF generation failed" });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};
