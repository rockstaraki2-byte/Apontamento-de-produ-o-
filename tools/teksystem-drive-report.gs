// Paste into a new Google Apps Script project. No tokens/passwords belong in this file.
// Set Script Property TEKSYSTEM_REPORT_SECRET (>=32 characters), then deploy a Web App.
const TEKSYSTEM_REPORT_ROOT = '19BxckmRHkPs0C4V1rLHCZ2OgQb0xhhQE';

function reportJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function reportHex_(bytes) {
  return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function reportSame_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function reportChild_(parent, name) {
  var existing = parent.getFoldersByName(name);
  if (!existing.hasNext()) return parent.createFolder(name);
  var folder = existing.next();
  if (existing.hasNext()) throw new Error('PASTA_DUPLICADA: ' + name);
  return folder;
}
function doGet() {
  return reportJson_({ service: 'teksystem-reports', version: 1 });
}
function doPost(e) {
  var lock;
  try {
    if (!e || !e.postData || e.postData.contents.length > 1000000) return reportJson_({ sucesso: false, erro: 'REQUISICAO_INVALIDA' });
    var envelope = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('TEKSYSTEM_REPORT_SECRET');
    if (!secret || secret.length < 32) return reportJson_({ sucesso: false, erro: 'SEGREDO_NAO_CONFIGURADO' });
    if (typeof envelope.timestamp !== 'number' || Math.abs(Date.now() - envelope.timestamp) > 5 * 60 * 1000 || typeof envelope.payload !== 'string') return reportJson_({ sucesso: false, erro: 'REQUISICAO_EXPIRADA' });
    var expected = reportHex_(Utilities.computeHmacSha256Signature(String(envelope.timestamp) + '\n' + envelope.payload, secret, Utilities.Charset.UTF_8));
    if (!reportSame_(expected, envelope.signature)) return reportJson_({ sucesso: false, erro: 'NAO_AUTORIZADO' });
    var report = JSON.parse(envelope.payload);
    var started = new Date(report.startedAt);
    if (!/^teksystem-\d{14,20}$/.test(report.runId) || isNaN(started.getTime()) || typeof report.content !== 'string' || report.content.length > 500000) return reportJson_({ sucesso: false, erro: 'RELATORIO_INVALIDO' });
    var months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var monthFolder = months[Number(Utilities.formatDate(started, 'America/Sao_Paulo', 'MM')) - 1] + ' ' + Utilities.formatDate(started, 'America/Sao_Paulo', 'yyyy');
    var dayFolder = Utilities.formatDate(started, 'America/Sao_Paulo', 'dd-MM-yyyy');
    var fileName = 'Execucao-' + Utilities.formatDate(started, 'America/Sao_Paulo', 'yyyy-MM-dd-HH') + 'h' + Utilities.formatDate(started, 'America/Sao_Paulo', 'mm') + '-' + report.runId + '.txt';
    lock = LockService.getScriptLock();
    lock.waitLock(15000);
    // The request cannot select another root, move files, delete files or change sharing.
    var root = DriveApp.getFolderById(TEKSYSTEM_REPORT_ROOT);
    var month = reportChild_(root, monthFolder);
    var day = reportChild_(month, dayFolder);
    var matches = day.getFilesByName(fileName);
    var file;
    if (matches.hasNext()) {
      file = matches.next();
      if (matches.hasNext()) throw new Error('RELATORIO_DUPLICADO');
      file.setContent(report.content);
    } else file = day.createFile(fileName, report.content, MimeType.PLAIN_TEXT);
    return reportJson_({ sucesso: true, runId: report.runId, rootFolderId: TEKSYSTEM_REPORT_ROOT,
      monthFolder: monthFolder, dayFolder: dayFolder, fileId: file.getId(), url: file.getUrl() });
  } catch (error) {
    return reportJson_({ sucesso: false, erro: String(error.message || 'FALHA_NO_DRIVE').slice(0, 300) });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
