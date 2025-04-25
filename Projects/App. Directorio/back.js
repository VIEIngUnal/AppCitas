const baseData = SpreadsheetApp.openById('1ItowGoaaVSlC3BPZbJaYlk2n5XoZInHozLL-XMxreu0');
const sheet = baseData.getSheetByName('Data');
const generalDataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc');
const directorySheet = generalDataBase.getSheetByName('Directorio');
var validEmailsConsult = directorySheet.getRange('2:2').getValues().flat().filter(Boolean)[0].split(', ');
var validEmailsEdit = directorySheet.getRange('4:4').getValues().flat().filter(Boolean)[0].split(', ');
const link = 'https://script.google.com/macros/s/AKfycbym4nw-_eFERadjLo-Judyxjpmo7a9yFsw27Y5CNLmKK8EcUNKVRdwzNHYvvckUjvx7/exec';

function doGet() { // Pendiente validación de hora 1:30 3:30 a.m.
  let today = new Date()
  let hour = today.getHours();
  if (hour != 2){
    return HtmlService.createHtmlOutputFromFile('open').setTitle('Directorio - VIE');
  } else {
    return HtmlService.createHtmlOutputFromFile('close').setTitle('Directorio - VIE');
  }
}

function getData() {
  let userEmail = Session.getActiveUser().getEmail();
  let output = [userEmail];
  if (validEmailsConsult.includes(userEmail)){
    output = link;
  }
  return output;
}

function editRow(row, data) {
  data = cleanData(data);
  let userEmail = Session.getActiveUser().getEmail();
  let output = [userEmail];
  if (validEmailsEdit.includes(userEmail)){
    let year = (new Date()).getFullYear()
    let newSources = sheet.getRange(`I${row}`).getValue().split(', ');
    let newSource = `${year}PE`;
    newSources.includes(newSource) ? null : newSources.push(newSource);
    data.push(newSources.join(', '))
    sheet.getRange(`${row}:${row}`).setValues([data]);
    output = 'Done';
  }
  return output;
}

function cleanData(data) {
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 'No reportado') data[i] = '';
  }
  return data
}
