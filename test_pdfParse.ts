import fs from "fs";
import pdfParse from "pdf-parse-debugging-disabled";

async function run() {
  const parseFunc = typeof pdfParse === "function" ? pdfParse : (pdfParse as any).default;
  try {
    const data = await parseFunc(Buffer.from("fake pdf"));
    console.log("Success?", data);
  } catch (e: any) {
    console.log("Error inside pdfParse:", e.message);
  }
}
run();
