function doPost(e) {
  var sheet = SpreadsheetApp.openById("YOUR_SHEET_ID").getActiveSheet();
  var params = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    params.mealTime,
    params.mealType,
    params.foodItems,
    params.stoolTime,
    params.stoolType
  ]);
  return ContentService.createTextOutput("OK");
}
