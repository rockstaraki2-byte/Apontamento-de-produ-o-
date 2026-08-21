// Helper functions for Zebra ZPL printing, including converting images to monochrome ZPL Hex graphics

export const imageToZPLHex = (
  imageUrl: string,
  width: number,
  height: number
): Promise<{ hex: string; bytesPerRow: number; byteCount: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        // Fill solid white background for transparent PNGs
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Preserve exact aspect ratio
        const imgRatio = img.width / img.height;
        const targetRatio = width / height;
        let drawW = width;
        let drawH = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > targetRatio) {
          drawH = width / imgRatio;
          offsetY = (height - drawH) / 2;
        } else {
          drawW = height * imgRatio;
          offsetX = (width - drawW) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // Initialize 2D luminance array (0 = black, 255 = white)
        const gray: number[][] = [];
        for (let y = 0; y < height; y++) {
          gray[y] = new Float32Array(width) as any;
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // Blend transparent pixels gracefully with white background
            if (a < 32) {
              gray[y][x] = 255;
            } else {
              const alphaNorm = a / 255;
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              gray[y][x] = lum * alphaNorm + 255 * (1 - alphaNorm);
            }
          }
        }

        // Apply Floyd-Steinberg error-diffusion dithering for crisp monochrome rendering
        const bytesPerRow = Math.ceil(width / 8);
        const byteCount = bytesPerRow * height;

        let hexString = "";
        for (let y = 0; y < height; y++) {
          let byteVal = 0;
          let bitsInByte = 0;
          let rowHex = "";

          for (let x = 0; x < width; x++) {
            const oldVal = gray[y][x];
            // Threshold at 128 (natural midpoint)
            const newVal = oldVal < 128 ? 0 : 255;
            const isBlack = newVal === 0;
            const error = oldVal - newVal;

            // Diffuse quantization error to neighboring pixels
            if (x + 1 < width) {
              gray[y][x + 1] += error * (7 / 16);
            }
            if (x - 1 >= 0 && y + 1 < height) {
              gray[y + 1][x - 1] += error * (3 / 16);
            }
            if (y + 1 < height) {
              gray[y + 1][x] += error * (5 / 16);
            }
            if (x + 1 < width && y + 1 < height) {
              gray[y + 1][x + 1] += error * (1 / 16);
            }

            if (isBlack) {
              byteVal |= 1 << (7 - bitsInByte);
            }
            bitsInByte++;

            if (bitsInByte === 8) {
              rowHex += byteVal.toString(16).padStart(2, "0").toUpperCase();
              byteVal = 0;
              bitsInByte = 0;
            }
          }

          if (bitsInByte > 0) {
            rowHex += byteVal.toString(16).padStart(2, "0").toUpperCase();
          }
          hexString += rowHex;
        }

        resolve({ hex: hexString, bytesPerRow, byteCount });
      } catch (e) {
        console.error("Error converting image to ZPL:", e);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = imageUrl;
  });
};

export const removeAccents = (str: string) => {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export interface ZPLLabelItemData {
  id: string;
  orderCode: string;
  batchName: string;
  customerName: string;
  itemName: string;
  itemCode: string;
  color: string;
  size: string;
  variation: string;
  quantity: number;
  unitLabel?: string;
  imageUrl?: string | null;
  barcodeData: string;
  dateStr: string;
}

export const generateZPLFromBatchLabels = async (
  labelItems: ZPLLabelItemData[],
  logoUrl?: string,
  companyName: string = "IMPÉRIO ACESSÓRIOS",
  showImage: boolean = true,
  companySubtitle?: string
): Promise<string> => {
  if (!labelItems || labelItems.length === 0) {
    return "";
  }

  // Pre-load company logo to ZPL graphics once if provided
  let logoZPLCommand = "";
  if (logoUrl) {
    const logoImg = await imageToZPLHex(logoUrl, 44, 44);
    if (logoImg) {
      logoZPLCommand = `^FO40,15^GFA,${logoImg.byteCount},${logoImg.byteCount},${logoImg.bytesPerRow},${logoImg.hex}^FS`;
    }
  }

  const logoBlock = logoZPLCommand
    ? logoZPLCommand
    : `^FO40,15^GB44,44,2,B,3^FS`;

  const companyClean = removeAccents(companyName).toUpperCase();
  const subtitleClean = companySubtitle ? removeAccents(companySubtitle).toUpperCase().slice(0, 35) : "";

  const zplPromises = labelItems.map(async (label) => {
    const cleanName = removeAccents(label.itemName).toUpperCase().slice(0, 48);
    const cleanCustomer = removeAccents(label.customerName).toUpperCase().slice(0, 36);
    const cleanColor = removeAccents(label.color || "-").toUpperCase().slice(0, 24);
    const cleanVariation = removeAccents(label.variation || "-").toUpperCase().slice(0, 24);
    const cleanBatchName = removeAccents(label.batchName).toUpperCase().slice(0, 28);
    const unitStr = removeAccents(label.unitLabel || "UN").toUpperCase();

    // Calculate Batch Badge width & positioning
    const badgeWidth = Math.max(120, cleanBatchName.length * 13 + 18);
    const badgeX = 500 - badgeWidth;
    const badgeTextX = badgeX + 10;
    const batchBadgeBlock = `^FO${badgeX},15^GB${badgeWidth},34,34,B,3^FS^FO${badgeTextX},23^A0N,18,16^FR^FD${cleanBatchName}^FS`;

    const maxTitleWidth = badgeX - 110;

    // Convert product image to ZPL Graphic if available and enabled
    let barcodeOrImageBlock = "";
    if (showImage && label.imageUrl) {
      const zplImg = await imageToZPLHex(label.imageUrl, 240, 240);
      if (zplImg) {
        barcodeOrImageBlock = `^FO540,80^GFA,${zplImg.byteCount},${zplImg.byteCount},${zplImg.bytesPerRow},${zplImg.hex}^FS`;
      }
    }

    if (!barcodeOrImageBlock) {
      const codeData = label.itemCode && label.itemCode !== "S/C" ? label.itemCode : label.orderCode;
      barcodeOrImageBlock = `^FO535,110^BY2,3,110^BCN,110,Y,N,N^FD${codeData}^FS`;
    }

    const companyHeaderBlock = subtitleClean
      ? `^FO100,14^A0N,20,18^FB${maxTitleWidth},1,0,L^FD${companyClean}^FS\n^FO100,36^A0N,16,14^FB${maxTitleWidth},1,0,L^FD${subtitleClean}^FS`
      : `^FO100,16^A0N,24,22^FB${maxTitleWidth},2,0,L^FD${companyClean}^FS`;

    return `^XA
^PW800
^LL400
^CI28

${logoBlock}
${companyHeaderBlock}

${batchBadgeBlock}

^FO40,66^GB460,2,2^FS

^FO40,74^A0N,38,34^FB460,2,0,L^FD${cleanName}^FS

^FO40,146^A0N,24,24^FDCod: ${label.itemCode}  |  Pedido: #${label.orderCode}^FS

^FO40,174^GB460,54,3,B,4^FS
^FO52,190^A0N,24,22^FDCor: ${cleanColor}^FS
^FO280,194^A0N,18,16^FB210,1,0,R^FDVar: ${cleanVariation}^FS

^FO40,242^A0N,28,28^FDLote: ${cleanBatchName}^FS

^FO40,282^GB460,3,3^FS

^FO40,294^A0N,26,24^FDData: ${label.dateStr}^FS
^FO40,324^A0N,26,24^FDCliente: ${cleanCustomer}^FS

^FO300,294^A0N,20,18^FB190,1,0,R^FDQUANTIDADE^FS
^FO300,318^A0N,48,46^FB190,1,0,R^FD${label.quantity} ${unitStr}^FS

^FO510,12^GB2,376,2^FS
${barcodeOrImageBlock}

^PQ1
^XZ
`;
  });

  const zplTemplates = await Promise.all(zplPromises);
  return zplTemplates.join("");
};
