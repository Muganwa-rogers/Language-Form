/**
 * Language Course Registration — Google Apps Script backend.
 * Deploy as Web app: Execute as "Me", Who has access "Anyone".
 * Set Script Properties: ROOT_FOLDER_ID (the "Language Course Applications" folder ID).
 */

var MAX_BYTES = 5 * 1024 * 1024;
var COURSES = ['Kinyarwanda', 'English'];
var LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Not sure'];
var NETWORKS = ['MTN', 'Airtel'];
var MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

function doGet() {
  return json_({ ok: true, service: 'language-registration' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var d = JSON.parse(e.postData.contents);
    var err = validate_(d);
    if (err) return json_({ ok: false, error: err });

    var bytes = Utilities.base64Decode(d.file.data);
    var mime = sniff_(bytes);
    if (!mime) return json_({ ok: false, error: 'The receipt must be a real JPG, PNG or PDF file.' });
    if (bytes.length > MAX_BYTES) return json_({ ok: false, error: 'Receipt exceeds 5 MB.' });

    if (!lock.tryLock(30000)) return json_({ ok: false, error: 'Server busy, please try again.' });
    var props = PropertiesService.getScriptProperties();

    // Duplicate protection: same submissionId returns the original reference.
    var dupKey = 'sub_' + d.submissionId;
    var existing = props.getProperty(dupKey);
    if (existing && existing.indexOf('DONE:') === 0) return json_({ ok: true, reference: existing.slice(5), duplicate: true });

    var year = new Date().getFullYear();
    var ref = existing ? existing.replace('PENDING:', '') : null;
    if (!ref) {
      var counterKey = 'counter_' + year;
      var n = Number(props.getProperty(counterKey) || 0) + 1;
      props.setProperty(counterKey, String(n));
      ref = 'APP-' + year + '-' + ('0000' + n).slice(-4);
      props.setProperty(dupKey, 'PENDING:' + ref);
    }
    lock.releaseLock();

    var root = DriveApp.getFolderById(props.getProperty('ROOT_FOLDER_ID'));
    var appsFolder = sub_(root, 'Applications');
    var receiptsFolder = sub_(root, 'Payment Receipts');

    var receiptName = ref + '-Payment-Receipt.' + MIME_EXT[mime];
    removeExisting_(receiptsFolder, receiptName);
    var receipt = receiptsFolder.createFile(Utilities.newBlob(bytes, mime, receiptName));

    var pdfName = ref + '-Application.pdf';
    removeExisting_(appsFolder, pdfName);
    var html = buildHtml_(ref, d, receiptName);
    var pdf = Utilities.newBlob(html, 'text/html', ref + '.html').getAs('application/pdf').setName(pdfName);
    appsFolder.createFile(pdf);

    props.setProperty(dupKey, 'DONE:' + ref);
    return json_({ ok: true, reference: ref });
  } catch (ex) {
    console.error(ex);
    return json_({ ok: false, error: 'We could not save your application. Please try again.' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function validate_(d) {
  if (!d || typeof d !== 'object') return 'Invalid request.';
  if (!/^[0-9a-f-]{36}$/i.test(d.submissionId || '')) return 'Invalid submission id.';
  if (!d.fullName || String(d.fullName).trim().length < 3 || d.fullName.length > 120) return 'Full legal name is required.';
  if (!/^\+\d{7,15}$/.test(d.whatsapp || '')) return 'WhatsApp number must include country code.';
  if (d.email && (d.email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))) return 'Invalid email.';
  if (COURSES.indexOf(d.course) < 0) return 'Select a course.';
  if (LEVELS.indexOf(d.level) < 0) return 'Select a level.';
  if (NETWORKS.indexOf(d.network) < 0) return 'Select a network.';
  if (!(Number(d.amount) > 0)) return 'Invalid amount.';
  if (!d.transactionId || d.transactionId.length < 4 || d.transactionId.length > 60) return 'Transaction ID is required.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.paymentDate || '')) return 'Payment date is required.';
  if (d.declaration !== true) return 'The payment declaration must be confirmed.';
  if (d.message && d.message.length > 1000) return 'Message too long.';
  if (!d.file || !d.file.data) return 'Payment receipt is required.';
  return null;
}

// Check real file signatures, not extensions.
function sniff_(b) {
  if (b.length < 8) return null;
  var u = function (i) { return b[i] & 0xff; };
  if (u(0) === 0xff && u(1) === 0xd8 && u(2) === 0xff) return 'image/jpeg';
  if (u(0) === 0x89 && u(1) === 0x50 && u(2) === 0x4e && u(3) === 0x47) return 'image/png';
  if (u(0) === 0x25 && u(1) === 0x50 && u(2) === 0x44 && u(3) === 0x46) return 'application/pdf';
  return null;
}

function sub_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// On a retry after partial failure, replace half-written files instead of duplicating.
function removeExisting_(folder, name) {
  var it = folder.getFilesByName(name);
  while (it.hasNext()) it.next().setTrashed(true);
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function buildHtml_(ref, d, receiptName) {
  var row = function (k, v) { return '<tr><td class="k">' + esc_(k) + '</td><td>' + esc_(v) + '</td></tr>'; };
  var submitted = Utilities.formatDate(new Date(), 'Africa/Kigali', 'yyyy-MM-dd HH:mm') + ' (Kigali)';
  return '<html><head><style>' +
    'body{font-family:Arial,sans-serif;color:#1a1a1a;margin:36px;font-size:12px}' +
    'h1{color:#1f4d3a;font-size:22px;margin:0}.sub{color:#666;margin:4px 0 20px}' +
    '.ref{border:1px solid #1f4d3a;color:#1f4d3a;padding:8px 12px;display:inline-block;font-weight:bold;font-size:14px;margin-bottom:18px}' +
    'h2{font-size:13px;color:#1f4d3a;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:22px;text-transform:uppercase;letter-spacing:1px}' +
    'table{width:100%;border-collapse:collapse}td{padding:6px 4px;vertical-align:top;border-bottom:1px solid #eee}.k{width:35%;color:#666}' +
    '.note{margin-top:24px;padding:10px;background:#f5f3ee;color:#555;font-size:11px}' +
    '</style></head><body>' +
    '<h1>Language Course Application</h1><div class="sub">Submitted ' + esc_(submitted) + '</div>' +
    '<div class="ref">Reference: ' + esc_(ref) + '</div>' +
    '<h2>Applicant</h2><table>' + row('Full legal name', d.fullName) + row('WhatsApp', d.whatsapp) + row('Email', d.email || '—') + '</table>' +
    '<h2>Course</h2><table>' + row('Course', d.course) + row('Proficiency level', d.level) + '</table>' +
    '<h2>Payment</h2><table>' + row('Network', d.network) + row('Amount paid', d.amount + ' RWF') + row('Transaction ID', d.transactionId) + row('Payment date', d.paymentDate) + row('Receipt file', receiptName) + '</table>' +
    '<h2>Declaration</h2><table>' + row('Own-name payment declaration', d.declaration ? 'Confirmed by applicant' : 'NOT confirmed') + row('Message', d.message || '—') + '</table>' +
    '<div class="note">Payment status: PENDING MANUAL VERIFICATION. Compare the legal name above with the name on the mobile money record before approving.</div>' +
    '</body></html>';
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to authorize and check the folder setup. */
function testSetup() {
  var root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID'));
  sub_(root, 'Applications'); sub_(root, 'Payment Receipts');
  Logger.log('OK: ' + root.getName());
}
