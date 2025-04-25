//Constantes utiles
const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc') 
const cancellationSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Canceladas')
var alwaysInvitedEmails = dataBase.getRange('13:13').getValues().flat()
const eventTitles = dataBase.getRange('15:15').getValues().flat()
const professionals = dataBase.getRange('5:5').getValues().flat()
const servicesId = dataBase.getRange('7:7').getValues().flat()
const threeWeeksMilis = 20*24*60*60*1000
const oneDayMilis = 24*60*60*1000
const countAlwaysInvited = []
alwaysInvitedEmails.map(function separate (invitedEmails) {
    emailsPerService = invitedEmails.split(',').map(email => email.trim())
    countAlwaysInvited.push(emailsPerService.length)
})
alwaysInvitedEmails = [...new Set(alwaysInvitedEmails.join().split(',').map(email => email.trim()))]

//Funciones
function doGet() {//Sitio web
    return HtmlService.createHtmlOutputFromFile("Lobby").setTitle('Servicios de apoyo')
}

function appointmentEliminator() {
  let initialDate = new Date()
  let day = initialDate.getDay()
  day == 6 ? initialDate.setMilliseconds(oneDayMilis):initialDate.setMilliseconds(-day * oneDayMilis)
  let lastDate = new Date(initialDate.getTime() + threeWeeksMilis)
  for (let service = 0; service < professionals.length; service++) {
    try{
      let events = CalendarApp.getCalendarById(professionals[service]).getEvents(initialDate, lastDate)
      eventsValidation(service, events)
    }catch(e){
      console.log('Error: ' + e.message)
    }
  }
  //Se podría mejorar con un control de tiempo, para que el usuario no pueda cancelar una vez sea hora de la cita,
  //sin embargo, nunca se ha presentado ese caso.
}

function eventsValidation(service, events) {
  for (let i = 0; i < events.length; i++) {
    let event = events[i]
    let isRejected = guestsValidation(event, service)
    if (!isRejected[0]) continue
    addHistory(event, service, isRejected[1])
    event.deleteEvent()
  }
}

function guestsValidation(event, service) {
  let title = event.getTitle()
  if (!title.includes(eventTitles[service])) return false
  let rejected = 0
  let guests = event.getGuestList()
  let rejectedEmails = []
  let totalGuests = guests.length
  for(let j = 0; j < totalGuests; j++){
    let guest = guests[j]
    let guestEmail = guest.getEmail()
    if (!alwaysInvitedEmails.includes(guestEmail) && guest.getGuestStatus() == "NO"){
      rejectedEmails.push(guestEmail)
      rejected++
    }
  }
  let isRejected = rejected == totalGuests - countAlwaysInvited[service] //¿Todos rechazaron la cita?
  return [isRejected, rejectedEmails]
}

function addHistory(event, service, guests) {
  let today = new Date()
  cancellationSheet.insertRowAfter(cancellationSheet.getMaxRows())
  let row = cancellationSheet.getMaxRows()
  let range = cancellationSheet.getRange(`A${row}:D${row}`)
  range.setValues([[today, event.getStartTime(), servicesId[service], guests.join(', ')]])
  range.setFontWeight("normal")
}
