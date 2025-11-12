function appendHeadersIfMissing_(sheet) {
  const expected = ['Timestamp', 'SourcePage', 'FullName', 'Email', 'Phone', 'Country', 'Referral', 'GoogleID', 'GoogleName', 'GoogleEmail', 'GoogleAvatar', 'UserAgent', 'IP', 'RawJSON'];
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn() || expected.length).getValues()[0];
  const hasHeaders = currentHeaders.some(Boolean);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  }
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Headers', '*');

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request body');
    }
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users') || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Users');
    appendHeadersIfMissing_(sheet);
    const row = [
      new Date(),
      data.SourcePage || '',
      data.FullName || '',
      data.Email || '',
      data.Phone || '',
      data.Country || '',
      data.Referral || '',
      data.GoogleID || '',
      data.GoogleName || '',
      data.GoogleEmail || '',
      data.GoogleAvatar || '',
      data.UserAgent || '',
      data.IP || '',
      data.RawJSON || ''
    ];
    sheet.appendRow(row);
    output.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, message: err.message }));
  }
  return output;
}
