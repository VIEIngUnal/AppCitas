//Globaly constants
const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc')
const driveSheet = dataBase.getSheetByName('Organizador drive')
const isActived = driveSheet.getRange('15:15').getValue().toLowerCase()
const currentDate = new Date()
//Funciones
function annualOrganizer() {//Verifica si es el 31 de diciembre
  let currentDate = new Date()
  let month = currentDate.getMonth()
  if(month == 11 && isActived == 'sí') driveOrganizer()
}

function string2Array(str) {
  return str.split(',').map(element => element.trim())
}

function driveOrganizer() {
  const currentYear = currentDate.getFullYear()
  const newYear = currentYear + 1
  const vicedeanFolderID = driveSheet.getRange('9:9').getValue()
  const folderYearsID = driveSheet.getRange('11:11').getValue()
  const folderYears = DriveApp.getFolderById(folderYearsID)
  const folderAppsID = driveSheet.getRange('13:13').getValue()
  const historyID = '17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY'
  const fileDatesHistory = DriveApp.getFileById(historyID)
  const historyBook = SpreadsheetApp.openById(historyID)
  //Nombres de las hojas en la base de datos
  const sheetsProfessionals = dataBase.getSheetByName('App. Citas').getRange('3:3').getValues().flat()
  const otherSheets = string2Array(driveSheet.getRange('7:7').getValue())
  const sheetsHistory = sheetsProfessionals.concat(otherSheets)
  //A mover
  const vicedeanFolder = DriveApp.getFolderById(vicedeanFolderID)
  const folderApps = DriveApp.getFolderById(folderAppsID)
  //A crear
  const newYearFolders = string2Array(driveSheet.getRange('3:3').getValue())
  const currentYearFolders = string2Array(driveSheet.getRange('5:5').getValue()) 
  //Crear y organizar carpetas
  //Carpeta del año actual
  const currentYearFolder = DriveApp.getRootFolder().getFoldersByName(`AÑO ${currentYear}`).next()
  currentYearFolder.moveTo(folderYears)
  currentYearFolders.forEach(name => currentYearFolder.createFolder(`${name} ${currentYear}`))
  //Carpeta año nuevo
  const newYearFolder = DriveApp.getRootFolder().createFolder(`AÑO ${newYear}`)
  newYearFolders.forEach(name => newYearFolder.createFolder(`${name} ${newYear}`))
  folderApps.setName(`APLICATIVOS ${newYear}`).moveTo(newYearFolder)
  //Carpeta vicedecano
  let currentYearVicedeanFolder = vicedeanFolder.getFoldersByName(`AÑO ${currentYear}`)
  if (!currentYearVicedeanFolder.hasNext()) {
    currentYearVicedeanFolder = vicedeanFolder.createFolder(`AÑO ${currentYear}`)
  } else currentYearVicedeanFolder = currentYearVicedeanFolder.next()
  let filesVicedeanFolder = vicedeanFolder.getFiles()
  while (filesVicedeanFolder.hasNext()) filesVicedeanFolder.next().moveTo(currentYearVicedeanFolder)
  vicedeanFolder.createFolder(`AÑO ${newYear}`)
  vicedeanFolder.moveTo(newYearFolder)
  //Carpeta años anteriores
  folderYears.setName(`AÑO ${currentYear} Y ANTERIORES`)
  //Organizar historiales
  //Dejar una copia del historial en la carpeta del año actual
  const currentDatesAppFolder = currentYearFolder.getFoldersByName(`APP. CITAS ${currentYear}`).next()
  fileDatesHistory.makeCopy().setName(`Historial de citas ${currentYear}`).moveTo(currentDatesAppFolder)
  fileDatesHistory.setName(`Historial de citas ${newYear}`)
  //Limpiar el historial del año nuevo
  sheetsHistory.forEach((sheetName) => {
    const sheet = historyBook.getSheetByName(sheetName)
    sheet.setFrozenRows(3)
    try{sheet.deleteRows(4, sheet.getMaxRows() - 4)}catch(e){}
    sheet.getRange('4:4').clearContent()
    sheet.setFrozenRows(3)
  })
}
