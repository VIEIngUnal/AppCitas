//SOLO DEBE CAMBIAR LA CONSTANTE serviceIndex, NADA MÁS
const serviceIndex = 6
//Base de datos
const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc')
const appData = dataBase.getSheetByName('App. Citas')
const nameSheetHistory = appData.getRange(3, serviceIndex).getValue()
const emailProfessional = appData.getRange(5, serviceIndex).getValue()
const serviceWeeks = appData.getRange(9, serviceIndex).getValue()
const durationDate = appData.getRange(11, serviceIndex).getValue()
const alwaysInvited = appData.getRange(13, serviceIndex).getValue()
var title = appData.getRange(15, serviceIndex).getValue()
const modalitiesText = appData.getRange(17, serviceIndex).getValue().split(';').filter(Boolean)
var [orderData, tests] = appData.getRange(21, serviceIndex).getValue().split(';').filter(Boolean)
orderData = orderData.split(',')
tests = tests.split(',')
const sanctionsColumns = appData.getRange(23, serviceIndex).getValue().split(',').filter(Boolean).map(Number)
const sanctionsLimit = appData.getRange(25, serviceIndex).getValue()
//Constantes útiles
const daysEvents = serviceWeeks * 7 - 1
const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const daysNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const dateHistory = SpreadsheetApp.openById('17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY')
const sheetHistory = dateHistory.getSheetByName(nameSheetHistory)
const penaltyHistory = SpreadsheetApp.openById('1xLGkqFusH6L2tumVxuWYjkwS1XtRKZF8gyt53RlaytU')
const sanctionedHistory = penaltyHistory.getSheetByName('HISTORIAL DE SANCIONADOS')
const currentSanctioned = penaltyHistory.getSheetByName('LISTA TEMPORAL')
const calendar = CalendarApp.getCalendarById(emailProfessional)
//Funciones
function doGet() {//Llamado del archivo .html
  return HtmlService.createHtmlOutputFromFile("t").setTitle('Solicitud de cita')
}
function request(fullDateAppointment, formData, serviceData) {//Verificación de usuario
  const emailApplicant = formData[1]
  const dateToday = new Date()
  const hourBeforehand = dateToday.getTime() + (60 * 60 * 1000)
  const dateAppointment = new Date(fullDateAppointment.slice(9, 28))
  const startTime = dateAppointment.getTime()
  const dateLastSchedule = new Date()
  dateLastSchedule.setMilliseconds((-dateLastSchedule.getDay() + daysEvents) * 24 * 60 * 60 * 1000) //Ultima fecha en la agenda
  dateLastSchedule.setHours(23, 59, 59)
  if (dateAppointment.getTime() > dateLastSchedule.getTime()) return [0] //Franja horaria no disponible
  if (hourBeforehand > startTime) return [0] //Franja horaria no disponible
  const endTime = startTime + (durationDate * 60 * 1000)
  const eventsAppointmentDay = calendar.getEventsForDay(dateAppointment)
  for (let eventIndex = 0; eventIndex < eventsAppointmentDay.length; eventIndex++) {//Verificación franja horaria
    const event = eventsAppointmentDay[eventIndex]
    const startEvent = event.getStartTime()
    const endEvent = event.getEndTime()
    const firstCase = startTime >= startEvent && startTime < endEvent
    const secondCase = endTime > startEvent && endTime <= endEvent
    const thirdCase = startEvent > startTime && endEvent < endTime
    if (firstCase || secondCase || thirdCase) return [0] //Franja horaria no disponible
  }
  const peopleHistory = sanctionedHistory.getRange('B2:B').getValues()
  for (let userSanctioned = 0; userSanctioned < peopleHistory.length; userSanctioned++) {
    if (peopleHistory[userSanctioned] == emailApplicant) {
      const row = userSanctioned + 2
      if (sanctionedHistory.getRange(row, sanctionsColumns[0]).getValue() > sanctionsLimit) return [1] //Sancionado de por vida
    }
  }
  const currentPeople = currentSanctioned.getRange('B2:B').getValues()
  const daysPenalty = currentSanctioned.getRange(2, sanctionsColumns[2], currentSanctioned.getMaxRows() - 1).getValues()
  for (let userInSanction = 0; userInSanction < currentPeople.length; userInSanction++) {
    if (currentPeople[userInSanction] == emailApplicant && daysPenalty[userInSanction] > 0) {
      const row = userInSanction + 2
      const dateSanction = currentSanctioned.getRange(row, sanctionsColumns[1]).getValue()
      const daysSanction = daysPenalty[userInSanction]
      return [2, dateSanction, daysSanction] //Sancionado actualmente hasta cierta cantidad de días
    }
  }
  const eventsUntilLastSchedule = calendar.getEvents(dateToday, dateLastSchedule) //Eventos a la hora hasta el ultimo día
  for (let eventIndex = 0; eventIndex < eventsUntilLastSchedule.length; eventIndex++) {
    const event = eventsUntilLastSchedule[eventIndex]
    const guest = event.getGuestByEmail(emailApplicant)
    const validEvent = event.getTitle().includes(title) && guest != null
    if (!validEvent) continue
    const datePending = guest.getGuestStatus() == 'INVITED' || guest.getGuestStatus() == 'YES'
    if (datePending) return [3] //Tiene una cita pendiente por cumplir
    const dateCanceled = guest.getGuestStatus() == 'NO'
    if (dateCanceled) return [4] //Cancelo una cita recientemente
  }
  const eventsToday = calendar.getEventsForDay(dateToday) //Todos los eventos del día
  const [fullDateToday, sameDay] = isSameDay(dateToday, fullDateAppointment)
  for (let eventIndex = 0; eventIndex < eventsToday.length; eventIndex++) {
    var event = eventsToday[eventIndex]
    const guest = event.getGuestByEmail(emailApplicant)
    const validEvent = event.getTitle().includes(title) && guest != null
    if (validEvent && sameDay) return [5] //Ya tuvo una cita hoy
  }
  const dates = [dateToday, fullDateToday, dateAppointment, fullDateAppointment, endTime]
  createAppointment(emailApplicant, formData, serviceData, dates)
  return [6] //Cita agendada con éxito
}
function isSameDay (firstDate, secondDate) {
  const firstDay = String(firstDate.getDate()).padStart(2, '0')
  const firstMonth = String(firstDate.getMonth() + 1).padStart(2, '0')
  const firstYear = firstDate.getFullYear()
  const fullFirstDate = `${firstYear}-${firstMonth}-${firstDay}`
  return [fullFirstDate , fullFirstDate == secondDate.slice(9, 19)]
}
function createAppointment(emailApplicant, formData, serviceData, dates) {//Crear cita en Google Calendar
  const userName = formData[0]
  title = title + userName
  const dateToday = dates[0]
  const fullHourToday = `${String(dateToday.getHours()).padStart(2, '0')}:${String(dateToday.getMinutes()).padStart(2, '0')}`
  const fullDateToday = dates[1] //'DD/MMM/YY' '08/oct/24'
  const dateAppointment = dates[2]
  const fullDateAppointment = dates[3] //'DD/MMM/YYYYYY-MM-DDTHH:MM:SSHH:MM P.M.M' '08/oct/242024-10-08T11:00:0011:00 a.m.V'
  const endTime = new Date(dates[4])
  const firstFormat = fullDateAppointment.slice(0, 9)
  const hourDate = fullDateAppointment.slice(28, 38)
  const modality =  fullDateAppointment.slice(-1)
  const location = modality == 'V' ? modalitiesText[0] : modalitiesText[1]
  const fullModality = modality == 'V' ? 'Virtual' : 'Presencial'
  const sessionEmail = Session.getActiveUser().getEmail()
  if (formData[6] == "") formData[6] = formData[5] //Departamento "", Departamento = Administrativo - OPS
  const detailsService = [[firstFormat, hourDate, fullDateToday, fullHourToday, fullModality, sessionEmail]]
  detailsService[0] = detailsService[0].concat(formData).concat(cleanServiceData(serviceData))
  sheetHistory.insertRowAfter(3)
  sheetHistory.getRange("4:4").setValues(detailsService).setFontWeight("normal")
  let invitados = `${emailProfessional},${emailApplicant},${alwaysInvited}`
  let dateDescription = 'La Vicedecanatura de Investigación y Extensión se permite informarle que su cita ha sido asignada según los siguientes términos.\n\n' +
    `<b>Nombre:</b> ${userName}\n` +
    `<b>Correo electrónico:</b> ${formData[1]}\n` +
    `<b>Identificación:</b> ${formData[2]} - ${formData[3]}\n` +
    `<b>Teléfono:</b> ${formData[4]}\n` +
    `<b>Tipo de vinculación:</b> ${formData[5]}\n` +
    `<b>Departamento o Programa:</b> ${formData[6]}\n` +
    bodyService(serviceData) +
    `<b>Lugar:</b> ${location}`
  let meetUrl = false
  if (modality == 'V') {
    const eventData = {
      description: dateDescription,
      guests: invitados,
      sendInvites: true
    }
    const event = calendar.createEvent(title, dateAppointment, endTime, eventData)
    const eventId = event.getId()
    meetUrl = Calendar.Events.get(emailProfessional, eventId.slice(0, eventId.length - 11)).conferenceData.entryPoints[0].label
  } else {
    invitados = invitados.split(',').map(function (correo) {return {'email': correo.trim()}})
    const eventData = {
      'summary': title, 'description': dateDescription,
      'start': { 'dateTime': dateAppointment.toISOString(), 'timeZone': 'America/Bogota'},
      'end': { 'dateTime': endTime.toISOString(), 'timeZone': 'America/Bogota'},
      'attendees': invitados, 'conferenceData': null
    };
    Calendar.Events.insert(eventData, emailProfessional, {
      conferenceDataVersion: 0,
      sendUpdates: 'all'
    })
  }
  dateDescription = dateDescription.replaceAll('\n', '<br>')
  const mailDate = getMailDate(dateAppointment, endTime)
  const emailBody = getBodyMail(meetUrl, title, mailDate, dateDescription)
  GmailApp.sendEmail(emailProfessional, 'SE HA AGENDADO UNA CITA CON EL SERVICIO DE APOYO', emailBody, {htmlBody: emailBody})
}
function cleanServiceData(serviceData) {//Depura los datos de la sección
  dataValidation(serviceData)
  const outPut = []
  const index = []
  tests.forEach(test => index.push(parseInt(test[1]))) //Extrae los indices de campos extra
  for (let datum = 0; datum < serviceData.length; datum++) {
    if (index.indexOf(datum) != -1) continue //Salta los campos extra
    outPut.push(serviceData[datum])
  }
  return outPut
}
function dataValidation(serviceData) {//01Otro...
  for (let i = 0; i < tests.length; i++) {//Si el primer valor es igual a Otro, asignar el segundo valor al primero
    const test = tests[i]
    const initial = test[0]
    const final = test[0]    
    if (serviceData[initial] == test.slice(2)) serviceData[initial] = serviceData[final]
  }
}
function bodyService(serviceData) {
  let outPut = ''
  orderData.forEach(datum => outPut += `<b>${datum.slice(1)}:</b> ${serviceData[datum[0]]}\n`)
  return outPut
}
function getMailDate(starTime, endTime) {
  const day = daysNames[starTime.getDay()]
  const month = months[starTime.getMonth()]
  const date = `${day} ${starTime.getDate()} ${month} ${starTime.getFullYear()} ⋅ `
  return `${date} ${getMailHour(starTime)} - ${getMailHour(endTime)} (Hora estándar de Colombia)`
}
function getMailHour(dateHour) {
  let hour = dateHour.getHours()
  const minutes = dateHour.getMinutes()
  const which = hour == 12 & minutes == 0 ? 'm' : hour < 12 ? 'am' : 'pm'
  hour = hour <= 12 ? hour : hour - 12
  hour = minutes == 0 ? `${hour}${which}` : `${hour}:${String(minutes).padStart(2, '0')}${which}`
  return hour
}
function getBodyMail(urlMeet, titleDate, hour, dateDescription) {
  const style = `<html><head><style>body, html {font-family: Roboto, Helvetica, Arial, sans-serif;}body {margin: 0;padding: 0;-webkit-font-smoothing: antialiased;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;}.body-container {padding-left: 16px;padding-right: 16px;}@media only screen and (min-width:580px) {.column-per-37 {width: 37% !important;max-width: 37%;}.column-per-63 {width: 63% !important;max-width: 63%;}}.main-container-inner, .info-bar-inner {padding: 12px 16px !important;}.main-column-table-ltr{padding-right: 0 !important;}@media only screen and (min-width:580px) {.main-container-inner {padding: 24px 32px !important;}.info-bar-inner {padding: 12px 32px !important;}.main-column-table-ltr {padding-right: 32px !important;}}.primary-text{color: #3c4043 !important;}.secondary-text{color: #70757a !important;}.primary-button {background-color: #1a73e8 !important;}.primary-button-text {cursor: pointer;color: #fff !important;}.underline-on-hover:hover {text-decoration: underline !important;}body, html {font-family:Roboto,Helvetica,Arial,sans-serif;}@font-face {font-family: 'Roboto';font-style: normal;font-weight: 400;src: url(//fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxP.ttf) format('truetype');}@font-face {font-family: 'Roboto';font-style: normal;font-weight: 500;src: url(//fonts.gstatic.com/s/roboto/v18/KFOlCnqEu92Fr1MmEU9fBBc9.ttf) format('truetype');}@font-face {font-family: 'Roboto';font-style: normal;font-weight: 700;src: url(//fonts.gstatic.com/s/roboto/v18/KFOlCnqEu92Fr1MmWUlfBBc9.ttf) format('truetype');}@font-face {font-family: 'Google Sans';font-style: normal;font-weight: 400;src: url(//fonts.gstatic.com/s/googlesans/v14/4UaGrENHsxJlGDuGo1OIlL3Owps.ttf) format('truetype');}@font-face {font-family: 'Google Sans';font-style: normal;font-weight: 500;src: url(//fonts.gstatic.com/s/googlesans/v14/4UabrENHsxJlGDuGo1OIlLU94YtzCwM.ttf) format('truetype');}@font-face {font-family: 'Google Sans';font-style: normal;font-weight: 700;src: url(//fonts.gstatic.com/s/googlesans/v14/4UabrENHsxJlGDuGo1OIlLV154tzCwM.ttf) format('truetype');}</style></head>`
  const headline = `<body><table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:100%;" class="body-container"><td style="" class="" align="left"><div style="height:16px;" aria-hidden="true">&nbsp;</div><table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:100%;" class=""><tbody><tr><td style="background-color: #e8f0fe;;color: #1a73e8;padding: 12px 32px; border-radius: 8px;font-family: Roboto, sans-serif;font-size: 14px; line-height: 20px;text-align: left;" class="info-bar-inner"><span style="font-weight: 700;">${titleDate}</span></td></tr></tbody></table><div style="height:12px;" aria-hidden="true">&nbsp;</div><table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:100%;" class=""><tbody><tr><td style="border: solid 1px #dadce0; border-radius: 8px; direction: rtl; font-size: 0; padding: 24px 32px; text-align: left; vertical-align: top;" class="main-container-inner">`
  const header = style + headline
  const divMeet = '<div class="column-per-37 outlook-group-fix" style="font-size: 13px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;overflow: hidden; word-wrap: break-word;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tbody><tr><td style="vertical-align:top;padding:0;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%"><tr><td style="font-size: 0; padding: 0; text-align: left; word-break: break-word;;padding-bottom:28px;"><a href="https://' + `${urlMeet}` + '?hs=224" class="primary-button-text" style="display: inline-block;font-family: &#39;Google Sans&#39;, Roboto, sans-serif;font-size: 14px; letter-spacing: 0.25px; line-height: 20px; mso-line-height-rule: exactly; text-decoration: none; text-transform: none; word-wrap: break-word; white-space: nowrap;color: #fff;font-weight: 700;white-space: normal;" target="_blank"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="display: inline-block"><tr><td align="center" role="presentation" valign="middle" style="background-color: #1a73e8; cursor: pointer; padding: 10px 25px; border: none; border-radius: 4px; margin: 0;" class="primary-button"><span class="primary-button-text" style="font-family: &#39;Google Sans&#39;, Roboto, sans-serif;font-size: 14px; letter-spacing: 0.25px; line-height: 20px; mso-line-height-rule: exactly; text-decoration: none; text-transform: none; word-wrap: break-word; white-space: nowrap;color: #fff;font-weight: 700;white-space: normal;">Únete con Google Meet</span></td></tr></table></a></td></tr><tr><td style="font-size: 0; padding: 0; text-align: left; word-break: break-word;;padding-bottom:24px;"><div style="font-family: Roboto, sans-serif;font-size: 14px; line-height: 20px; mso-line-height-rule: exactly; text-align: left;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" style="padding-bottom: 4px;"><tr><td><h2 class="primary-text" style="font-size: 14px;color: #3c4043; text-decoration: none;font-weight: 700;-webkit-font-smoothing: antialiased;margin: 0; padding: 0;">Vínculo de la reunión</h2></td></tr></table><div><a style="display: inline-block;;color: #70757a; text-decoration: none;" class="secondary-text underline-on-hover" href="https://' + `${urlMeet}` + '?hs=224">' + `${urlMeet}` + '</a></div></div></td></tr></table></td></tr></tbody></table></div>'
  const divTitle = `<div class="column-per-63 outlook-group-fix" style="font-size: 13px; text-align: left; direction: ltr; display: inline-block; vertical-align: top; width: 100%;overflow: hidden; word-wrap: break-word;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" class="main-column-table-ltr" style="padding-right: 32px; padding-left: 0;;table-layout: fixed;"><tbody><tr><td class="main-column-td" style="padding:0; vertical-align:top;"><table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%" style="table-layout: fixed;"><tr><td style="font-size: 0; padding: 0; text-align: left; word-break: break-word;;padding-bottom:2px;"><div style="font-family: &#39;Google Sans&#39;, Roboto, sans-serif;font-weight: 400; font-size: 22px; line-height: 28px;color: #3c4043; text-decoration: none;" class="primary-text" role="presentation"><span itemprop="name">${titleDate}`
  const divHour = `</span></div></td></tr><tr><td style="font-size: 0; padding: 0; text-align: left; word-break: break-word;;padding-bottom:24px;"><div style="font-family: Roboto, sans-serif;font-style: normal; font-weight: 400; font-size: 14px; line-height: 20px; letter-spacing: 0.2px;color: #3c4043; text-decoration: none;" class="primary-text" role="presentation"><span>${hour}`
  const divDescription = `</span></div></td></tr><tr><td style="font-size: 0; padding: 0; text-align: left; word-break: break-word;;padding-bottom:24px;"><div style="font-family: Roboto, sans-serif;font-style: normal; font-weight: 400; font-size: 14px; line-height: 20px; letter-spacing: 0.2px;color: #3c4043; text-decoration: none;" class="primary-text" role="presentation"><span>${dateDescription}</span></div></td></tr></table></td></tr></tbody></table></div></td></tr></tbody></table></td></table><br></body></html>`
  if (urlMeet) return `${header}${divMeet}${divTitle}${divHour}${divDescription}`
  return `${header}${divTitle}${divHour}${divDescription}`
}
