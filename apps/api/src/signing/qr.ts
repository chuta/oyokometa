import QRCode from "qrcode";

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 2, width: 168, errorCorrectionLevel: "M" });
}
