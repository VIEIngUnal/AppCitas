//Base de datos
//[wilson, Viviana, Cristian, Juan, Karol]
const dateHistory = SpreadsheetApp.openById('17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY')
const penaltyHistory = SpreadsheetApp.openById('1xLGkqFusH6L2tumVxuWYjkwS1XtRKZF8gyt53RlaytU')
const sanctionedHistory = penaltyHistory.getSheetByName('HISTORIAL DE SANCIONADOS')
const currentSanctioned = penaltyHistory.getSheetByName('LISTA TEMPORAL')
const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc')
const appData = dataBase.getSheetByName('App. Citas')
const sheetNames = appData.getRange('3:3').getValues().flat()
const emailsProfessionals = appData.getRange('5:5').getValues().flat()
let guestsNumber = appData.getRange('13:13').getValues().flat()
let alwaysInvited = guestsNumber.join(',').split(',')
guestsNumber = guestsNumber.map(guests => guests.split(',').map(guest => guest.trim()))
guestsNumber = guestsNumber.map(guests => guests.length + 1)
alwaysInvited = [...new Set(alwaysInvited.map(email => email.trim()))]
const titles = appData.getRange('15:15').getValues().flat()
let rawSanctionData = appData.getRange('23:23').getValues().flat()
rawSanctionData = rawSanctionData.map(element => JSON.parse(element))
const countTimesSanctioned = rawSanctionData.map(element => element[0])
const currentColumns = rawSanctionData.map(element => element[1])
const limiteTimesSanctioned = appData.getRange('25:25').getValues().flat().map(Number)
const sanctionsDays = appData.getRange('27:27').getValues().flat().map(days => JSON.parse(days))
//Constantes útiles
const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
//Funciones
function doGet() {//Llamado del archivo .html
  return HtmlService.createHtmlOutputFromFile("s").setTitle('App. Sanciones');
}
function request(toRead) {//Buscar cita toRead = [Fecha, hora, servicio]
  let answer = [];//titulo, nombre, correo, # sanciones
  const date = new Date(toRead[0])
  const fullHour = toRead[1]
  const service = toRead[2]
  const initialTime = getInitialTime(fullHour)
  const calendar = CalendarApp.getCalendarById(emailsProfessionals[service]);
  const eventsDay = calendar.getEventsForDay(date);
  for (let indexEvent = 0; indexEvent < eventsDay.length; indexEvent++) {
    const event = eventsDay[indexEvent]
    const startTime = event.getStartTime()
    const initialTimeEvent = startTime.getHours() + startTime.getMinutes() / 60.0
    const timeTest = initialTimeEvent == initialTime
    const titleService = titles[service]
    const titleEvent = event.getTitle()
    if (titleEvent.includes(titleService) && timeTest) {
      answer = [titleEvent, titleEvent.slice(titleService.length)]
      answer.push(getEmailSanctioned(event.getGuestList(), service, date, fullHour))
      answer.push(findSanction(service, answer[2])[0])
      break
    }
  }
  return answer
}
function getInitialTime(rawHour) {
  const testHour = rawHour.slice(6, 10) != 'a.m.' && rawHour.slice(0, 2) != '12'
  let initialHour = parseFloat(rawHour.slice(0, 2))
  initialHour = testHour ? initialHour + 12 : initialHour
  const initialMinutes = rawHour.slice(3, 5) == '00' ? 0 : rawHour.slice(3, 5) / 60.0
  const initialTime = initialHour + initialMinutes
  return initialTime
}
function getEmailSanctioned(guestList, service, date, fullHour) {//Obtener email inasistente
  let emailSanctioned = null
  const guestNumber = guestList.length
  const testService = guestNumber == guestsNumber[service]
  if (testService) {//Caso ideal, solo 1 invitado
    guestList.forEach((guest) => {
      const guestEmail = guest.getEmail()
      emailSanctioned = !alwaysInvited.includes(guestEmail) ? guestEmail : emailSanctioned
    })
  } else {//Hay más invitados, se busca en el historial
    const historySheet = dateHistory.getSheetByName(sheetNames[service])
    const lastRow = historySheet.getLastRow()
    const emails = historySheet.getRange(`H4:H${lastRow}`).getDisplayValues().flat()
    const dates = historySheet.getRange(`A4:B${lastRow}`).getDisplayValues()
    const fullCurrentDate = `${date.getDate()}/${months[date.getMonth()]}/${date.getFullYear() - 2000}`
    for (let indexDate = 0; indexDate < dates.length; indexDate++) {
      let dateData = dates[indexDate]
      if (fullCurrentDate == dateData[0] && fullHour == dateData[1]) emailSanctioned = emails[indexDate]
    }
  }
  return emailSanctioned
}
function findSanction(service, email) {//Datos en historial
  const peopleHistory = sanctionedHistory.getRange('B2:B').getValues()
  for (let indexPerson = 0; indexPerson < peopleHistory.length; indexPerson++) {
    if (peopleHistory[indexPerson] == email) {//Se encontró
      const row = indexPerson + 2
      const timesValue = sanctionedHistory.getRange(row, countTimesSanctioned[service]).getValue()
      const times = timesValue == '' ? 0 : timesValue
      return [times, row] //# sanciones, fila de ubicación
    }
  }
  return [0] //No se encontró -> # sanciones 0
}
function penalize(toRead) {//Sancionar, toRead = [servicio, correo, hora, nombre, fecha]
  const [service, emailSanctioned, hour, name, date] = toRead
  const sanctionedDate = dateFormat(date)
  const historyData = findSanction(service, emailSanctioned)
  const timesSanctioned = historyData[0]
  if (timesSanctioned > limiteTimesSanctioned[service]) return 1 //Sancionado permanentemente
  const currentData = findCurrent(service, emailSanctioned)
  const availableSanction = currentData[0]
  if (availableSanction) return 2 //Tiene una sanción vigente
  //Añadir al historial o sumar
  const dataSanctioned = [[name, emailSanctioned]]
  const isThere = historyData.length 
  let lastRow = isThere > 1 ? historyData[1] : sanctionedHistory.getLastRow()
  const timesColumn = countTimesSanctioned[service]
  const newTimesSanctioned = timesSanctioned + 1
  const columnDate = timesSanctioned == 0 ? timesColumn + 1 : timesColumn + newTimesSanctioned
  if (isThere == 1) {
    sanctionedHistory.insertRowAfter(lastRow)
    lastRow++
  }
  sanctionedHistory.getRange(`A${lastRow}:B${lastRow}`).setValues(dataSanctioned)
  sanctionedHistory.getRange(lastRow, countTimesSanctioned[service]).setValue(newTimesSanctioned)
  sanctionedHistory.getRange(lastRow, columnDate).setValue(sanctionedDate)
  if (newTimesSanctioned != limiteTimesSanctioned[service]) {
    let currentLastRow = currentSanctioned.getLastRow()
    const currenTest = currentLastRow != 1
    if (currentData.length == 2) {//Está pero no sancionado
      currentLastRow = currentData[1] - 1
    } else if (currenTest && !availableSanction) currentSanctioned.insertRowAfter(currentLastRow)
    currentLastRow++
    currentSanctioned.getRange(`A${currentLastRow}:B${currentLastRow}`).setValues(dataSanctioned)
    const data = [[sanctionedDate, hour, sanctionsDays[service][timesSanctioned]]]
    const serviceColumn = currentColumns[service]
    currentSanctioned.getRange(currentLastRow, serviceColumn, 1, 3).setValues(data)
  }
  return 3 //Sanción con exito
}
function dateFormat(fullDate) {//Cambiar formato fecha 
  const date = new Date(fullDate)
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}
function findCurrent(service, email) {//Datos sanción vigente
  const serviceColumn = currentColumns[service]
  const currentPeople = currentSanctioned.getRange('B2:B').getValues()
  for (let indexPerson = 0; indexPerson < currentPeople.length; indexPerson++) {
    const currentEmail = currentPeople[indexPerson]
    const row = indexPerson + 2;
    const serviceTest = currentSanctioned.getRange(row, serviceColumn).getValue() != '';
    if (currentEmail == email && serviceTest) return [true] //Tiene una sanción vigente
    if (currentEmail == email) return [false, row] //Se encontró pero con otro servicio
  }
  return [false] //No tiene sanciones vigentes
}