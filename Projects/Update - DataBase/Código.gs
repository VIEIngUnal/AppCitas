const history = SpreadsheetApp.openById('17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY')
const historySheets = history.getSheets()
const dataBase = SpreadsheetApp.getActive()
const schedules = dataBase.getSheetByName('Horarios')
const appSheet = dataBase.getSheetByName('App. Citas')
const sheetsName = appSheet.getRange('3:3').getValues().flat().filter(Boolean)
var serviceNames = appSheet.getRange('1:1').getValues().flat().filter(Boolean)
serviceNames = serviceNames.map(name => name.toUpperCase())
const modalDialog = HtmlService.createHtmlOutput('<p>Recuerde que los cambios que realice se verán reflejados en los sitios web, si modifica algún horario. Recuerde <b>Actualizar</b> desde el menú de <b>Opciones</b>.</p>').setWidth(250).setHeight(120)
//Funciones
function createOptionsMenu() {
  SpreadsheetApp.getUi().showModalDialog(modalDialog, 'PRECAUCIÓN')
  SpreadsheetApp.getUi().createMenu('Opciones').addItem('Actualizar', 'updateInfo').addToUi();
}

function updateInfo() {
  changeSheetsName()
  createScheduleArrays()
}

function changeSheetsName() {
  for (let indexSheet = 0; indexSheet < historySheets.length; indexSheet++) {
    const sheet = historySheets[indexSheet];
    const name = sheet.getRange('A1').getValue().toUpperCase();
    const textValidation = serviceNames.indexOf(name);
    if (textValidation == -1) continue
    sheet.setName(sheetsName[textValidation])
  }
}

function createScheduleArrays() {// hora1,...;0,1,2,...'0,2,...'1,2,...'...
  let monday = 2
  const rows = schedules.getMaxRows() - 3
  serviceNames.forEach(() => {
    const numericalSchedule = []
    let hours = schedules.getRange(4, monday - 1, rows).getValues().flat().filter(Boolean)
    hours = hours.map(hour => `"${hour}"`)
    for (let indexDay = 0; indexDay < 5; indexDay++) {
      const daySchedule = [] 
      const day = schedules.getRange(4, monday + indexDay, hours.length).getValues().flat()
      day.forEach((value) => {daySchedule.push(value.length > 7 ? 2 : value ? 1 : 0)})
      numericalSchedule.push(`[${daySchedule.join(',')}]`)
    }
    const outPut = `[[${hours.join(',')}],[${numericalSchedule.join(',')}]]`
    schedules.getRange(1, monday - 1).setValue(outPut)
    monday += 6
  })
}
