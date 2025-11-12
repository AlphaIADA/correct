const USER_HEADERS = ['Timestamp', 'Name', 'Email', 'Phone', 'Country', 'Source'];

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
  }
  const existing = sheet.getRange(1, 1, 1, sheet.getLastColumn() || USER_HEADERS.length).getValues()[0];
  const hasHeaders = existing.some(Boolean);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
  }
  return sheet;
}

function doPost(e) {
  const output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON).setHeader('Access-Control-Allow-Origin', '*');
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request body');
    }
    const data = JSON.parse(e.postData.contents);
    const sheet = ensureSheet_();
    const row = [
      new Date(),
      data.Name || '',
      data.Email || '',
      data.Phone || '',
      data.Country || '',
      data.Source || ''
    ];
    sheet.appendRow(row);
    output.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, message: err.message || 'Unknown error' }));
  }
  return output;
}
