import fs from 'fs';
import zlib from 'zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimeDate(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function findEndOfCentralDirectory(buffer) {
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('HWPX ZIP 정보를 찾을 수 없습니다.');
}

function readZip(buffer) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const files = {};
  const order = [];
  let offset = centralOffset;

  for (let i = 0; i < entryCount; i++) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + nameLength).toString('utf8');
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed);
    if (data.length !== uncompressedSize) throw new Error(`ZIP 압축 해제 크기 불일치: ${name}`);
    files[name] = { data, method };
    order.push(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return { files, order };
}

function writeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  const { time, date } = dosTimeDate();

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const method = entry.method === 0 ? 0 : 8;
    const compressed = method === 0 ? raw : zlib.deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuffer.copy(local, 30);
    localParts.push(local, compressed);

    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    nameBuffer.copy(central, 46);
    centralParts.push(central);

    localOffset += local.length + compressed.length;
  }

  const centralOffset = localOffset;
  const centralBuffer = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuffer.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralBuffer, eocd]);
}

function pngSize(data) {
  if (!data || data.length < 24) return [0, 0];
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

function fitImage(imgW, imgH, maxW, maxH) {
  if (imgW <= 0 || imgH <= 0) return [maxW, maxH];
  const scale = Math.min(maxW / imgW, maxH / imgH);
  return [Math.round(imgW * scale), Math.round(imgH * scale)];
}

function makePicRun(binId, picW, picH) {
  const cx = Math.floor(picW / 2);
  const cy = Math.floor(picH / 2);
  return `<hp:run charPrIDRef="3"><hp:pic id="1" zOrder="0" numberingType="PICTURE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" href="" groupLevel="0" instid="1" reverse="0"><hp:offset x="0" y="0"/><hp:orgSz width="${picW}" height="${picH}"/><hp:curSz width="0" height="0"/><hp:flip horizontal="0" vertical="0"/><hp:rotationInfo angle="0" centerX="${cx}" centerY="${cy}" rotateimage="1"/><hp:renderingInfo><hc:transMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:scaMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/><hc:rotMatrix e1="1" e2="0" e3="0" e4="0" e5="1" e6="0"/></hp:renderingInfo><hc:img binaryItemIDRef="${binId}" bright="0" contrast="0" effect="REAL_PIC" alpha="0"/><hp:imgRect><hc:pt0 x="0" y="0"/><hc:pt1 x="${picW}" y="0"/><hc:pt2 x="${picW}" y="${picH}"/><hc:pt3 x="0" y="${picH}"/></hp:imgRect><hp:imgClip left="0" right="${picW}" top="0" bottom="${picH}"/><hp:inMargin left="0" right="0" top="0" bottom="0"/><hp:imgDim dimwidth="${picW}" dimheight="${picH}"/><hp:effects/><hp:sz width="${picW}" widthRelTo="ABSOLUTE" height="${picH}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="CENTER" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:shapeComment>캔버스 이미지</hp:shapeComment></hp:pic><hp:t/></hp:run>`;
}

function applyPageLayout(firstParagraph, imageIsWide) {
  const pageWidth = 59528;
  const pageHeight = 84188;
  const margin = 1000;
  const displayWidth = imageIsWide ? pageHeight : pageWidth;
  const displayHeight = imageIsWide ? pageWidth : pageHeight;
  const usableWidth = displayWidth - margin * 2;
  const usableHeight = displayHeight - margin * 2;

  return {
    paragraph: firstParagraph
      .replace(/<hp:pagePr\b[^>]*>[\s\S]*?<\/hp:pagePr>/, `<hp:pagePr landscape="${imageIsWide ? 'WIDELY' : 'NARROWLY'}" width="${pageWidth}" height="${pageHeight}" gutterType="LEFT_ONLY"><hp:margin header="0" footer="0" gutter="0" left="${margin}" right="${margin}" top="${margin}" bottom="${margin}"/></hp:pagePr>`)
      .replace(/<hp:t>[\s\S]*?<\/hp:t>/g, '<hp:t/>'),
    usableWidth,
    usableHeight,
  };
}

function putImageInFirstParagraph(paragraph, imageRun, usableWidth) {
  const cleaned = paragraph
    .replace(/<hp:lineseg\b[^>]*horzsize="\d+"/g, match => match.replace(/horzsize="\d+"/, `horzsize="${usableWidth}"`))
    .replace(/<hp:t\/>/, '');
  const lineSegIndex = cleaned.indexOf('<hp:linesegarray>');
  if (lineSegIndex === -1) return cleaned.replace('</hp:p>', `${imageRun}</hp:p>`);
  return `${cleaned.slice(0, lineSegIndex)}${imageRun}${cleaned.slice(lineSegIndex)}`;
}

export function generateCanvasHwpx(templatePath, { image }) {
  if (!image) throw new Error('image가 없습니다.');
  const imageBuffer = Buffer.from(image.replace(/^data:image\/png;base64,/, ''), 'base64');
  const [imgW, imgH] = pngSize(imageBuffer);

  const template = fs.readFileSync(templatePath);
  const { files, order } = readZip(template);
  const sectionXml = files['Contents/section0.xml'].data.toString('utf8');
  let contentHpf = files['Contents/content.hpf'].data.toString('utf8');
  const imageIsWide = imgW >= imgH;
  const firstParagraphEnd = sectionXml.indexOf('</hp:p>') + '</hp:p>'.length;
  const firstParagraph = sectionXml.slice(sectionXml.indexOf('<hp:p '), firstParagraphEnd);
  const sectionOpen = sectionXml.slice(0, sectionXml.indexOf('<hp:p '));
  const { paragraph: sectionSettingsParagraph, usableWidth, usableHeight } = applyPageLayout(firstParagraph, imageIsWide);
  const [picW, picH] = fitImage(imgW, imgH, usableWidth, usableHeight);
  const firstParagraphWithImage = putImageInFirstParagraph(sectionSettingsParagraph, makePicRun('canvasImage1', picW, picH), usableWidth);
  const resultXml = `${sectionOpen}${firstParagraphWithImage}</hs:sec>`;

  contentHpf = contentHpf.replace(
    '</opf:manifest>',
    '<opf:item id="canvasImage1" href="BinData/canvas.png" media-type="image/png" isEmbeded="1"/></opf:manifest>'
  );

  const entries = order.map(name => {
    if (name === 'Contents/section0.xml') return { name, data: Buffer.from(resultXml, 'utf8'), method: files[name].method };
    if (name === 'Contents/content.hpf') return { name, data: Buffer.from(contentHpf, 'utf8'), method: files[name].method };
    return { name, data: files[name].data, method: files[name].method };
  });
  entries.push({ name: 'BinData/canvas.png', data: imageBuffer, method: 0 });
  return writeZip(entries);
}
