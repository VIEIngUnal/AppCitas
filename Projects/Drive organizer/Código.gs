//Constantes útiles
const sheets = ['Wilson Mateus', 'Viviana Claro', 'Cristian Herrera', 'Juan Martinleyes', 'Karol Peña', 'Canceladas'];
const columns = 'PNON';
const folders = ['COM_ÉTICA_', 'CONVOCATORIAS VICE ', 'CORRESPONDENCIA ENVIADA ', 'REPRESENTACIÓN LEGAL ', 'UAB_', 'TALLERES ', 'APP. CITAS '];
//Funciones
function isDecember() { //Verifica si es el 31 de diciembre
  let currentDate = new Date();
  let month = currentDate.getMonth();
  if(month == 11){ //31 De diciembre
    annualOrganizer();
  }
}
function annualOrganizer() { //Organiza el drive, solo carpetas directamente de la vice decanatura
  let currentYear = new Date().getFullYear();
  let lastYear = currentYear - 1;
  let nextYear = currentYear + 1;
  let currentFolder = DriveApp.getRootFolder().getFoldersByName('AÑO '+ currentYear).next();
  let destinationFolder = DriveApp.getRootFolder().getFoldersByName('AÑO ' + lastYear + ' Y ANTERIORES').next();
  //Crear la carpeta del siguiente año y mover los archivos del profesor
  let nextFolder = DriveApp.getRootFolder().createFolder('AÑO ' + nextYear);
  let teacherFolder = currentFolder.getFoldersByName('DOCUMENTOS NESTOR ALGECIRA E.').next();
  teacherFolder.createFolder('AÑO ' + nextYear);
  teacherFolder.moveTo(nextFolder);
  //Crear las folders necesarias
  folders.forEach((name) => {
    nextFolder.createFolder(name + nextYear);
  })
  //Mover los sheets del aplicativo de citas, historiales y sanciones
  let currentAppFolder = currentFolder.getFoldersByName('APP. CITAS ' + currentYear).next();
  let history = currentAppFolder.getFilesByName('Historial de citas ' + currentYear).next();
  history.setName('Historial de citas ' + nextYear);
  history.makeCopy('Historial de citas ' + currentYear);
  let newHistory = SpreadsheetApp.openById(history.getId());
  for(let i = 0; i < sheets.length; i++){
    let sheet = newHistory.getSheetByName(sheets[i]);
    let lastRow = sheet.getLastRow();
    let lastColumn = columns[i];
    let lastCell = lastRow > 3 ? lastColumn + lastRow :  lastColumn + '4';
    sheet.getRange('A4:' + lastCell).clearContent();
    sheet.deleteRows(5, lastRow - 4);
  }
  let sanctions = currentAppFolder.getFilesByName('Historial de sanciones').next();
  let nextAppFolder = nextFolder.getFoldersByName('APP. CITAS ' + nextYear).next();
  history.moveTo(nextAppFolder);
  sanctions.moveTo(nextAppFolder);
  //Mover la carpeta anterior a la carpeta de los años anteriores y cambiar el nombre a esta segunda
  currentFolder.moveTo(destinationFolder);
  destinationFolder.setName('AÑO ' + currentYear + ' Y ANTERIORES');
}
