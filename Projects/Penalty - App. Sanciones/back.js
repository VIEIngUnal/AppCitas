  //Archivos
  const penaltyHistory = SpreadsheetApp.openById('1xLGkqFusH6L2tumVxuWYjkwS1XtRKZF8gyt53RlaytU')
  const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc')
  //Sheets
  const sanctionedHistory = penaltyHistory.getSheetByName('HISTORIAL DE SANCIONADOS')
  const appData = dataBase.getSheetByName('App. Citas')
  //Columnas sheet app. citas1026297745
  const activeServices = getDatesAppDatum('37').map(element => element == 'No' ? 0 : 1)
  //[0] Sanciones acumuladas, [1] Fecha sanción actual, [2] Dias restantes de sanción actual
  const columnsPenaltyHistory = getDataActives('23').map(element => JSON.parse(element)) 
  //Valores utiles
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  //Funciones
  function getDatesAppDatum(row) {//Obtener datos de la hoja App. Citas
    return appData.getRange(`${row}:${row}`).getValues().flat()
  }

  function getDataActives(row) {//Solo obtiene los datos de los servicios activos
    const data = getDatesAppDatum(row)
    return data.filter((_, index) =>  activeServices[index])
  }

  function getDataServices() {//Horarios y nombres de los servicios
    const schedulesSheet = dataBase.getSheetByName('Horarios')
    const rawScheduleData = schedulesSheet.getRange('1:1').getValues().flat().filter(Boolean)
    const rawActiveSchedules = rawScheduleData.filter((_, index) => activeServices[index])
    const arraySchedules = rawActiveSchedules.map(element => JSON.parse(element))
    const nameDays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes']
    arraySchedules.forEach((schedule, indexSchedule) => {//Formato booleano a horas por día
      const hoursService = schedule[0]
      schedule[1].forEach((day, indexDay) => {
        let dayArray
        if (!day.filter(Boolean).length) {
          dayArray = [`No hay horario definido para los ${nameDays[indexDay]}`]
        } else {
          dayArray = ['']
          day.forEach((slot, indexSlot) => {if (slot) dayArray.push(hoursService[indexSlot])})
        }
        arraySchedules[indexSchedule][1][indexDay] = dayArray
      })
    })
    const outPut = [arraySchedules.map(schedule => schedule[1])]
    const titleServices = getDataActives('33')
    outPut.push(titleServices) //Nombre corto de los servicios para options en select
    console.log(outPut)
    const jsonOut = ContentService.createTextOutput(JSON.stringify(outPut))
    return jsonOut.setMimeType(ContentService.MimeType.JSON)
  }

  function doGet(e) {//Llamado el sitio web
    if (e.parameter.action == '1') return getDataServices()
    return HtmlService.createHtmlOutputFromFile("webSite").setTitle('App. Sanciones');
  }

  function findSanction(service, email) {//Buscar en historial de sanciones
    const peopleHistory = sanctionedHistory.getRange('B2:B').getValues()
    for (let indexPerson = 0; indexPerson < peopleHistory.length; indexPerson++) {
      if (peopleHistory[indexPerson] == email) {//Se encontró
        const row = indexPerson + 2
        const timesValue = sanctionedHistory.getRange(row, columnsPenaltyHistory[service][0]).getValue()
        const times = timesValue == '' ? 0 : timesValue
        return [times, row] //# sanciones, fila de ubicación
      }
    }
    return [0] //No se encontró -> # sanciones 0
  }

  function dateRequest(toRead) {//Buscar cita toRead = [Fecha, hora, servicio]
    let answer = [] //titulo, nombre, correo, # sanciones
    const date = new Date(toRead[0])
    const fullHour = toRead[1]
    const service = toRead[2]
    const initialTime = getInitialTime(fullHour)
    const emailsProfessionals = getDataActives('5')
    const calendar = CalendarApp.getCalendarById(emailsProfessionals[service])
    const eventsDay = calendar.getEventsForDay(date)
    const titleDates = getDataActives('15')
    //Posible mejora en caso de detectar fraude => Buscar la cita en el historial (no ha ocurrido aún).
    for (let indexEvent = 0; indexEvent < eventsDay.length; indexEvent++) {//Recorrer los eventos del día
      const event = eventsDay[indexEvent]
      const startTime = event.getStartTime()
      const initialTimeEvent = startTime.getHours() + startTime.getMinutes() / 60.0
      const timeTest = initialTimeEvent == initialTime //Coincide la hora
      const titleService = titleDates[service]
      const titleEvent = event.getTitle()
      if (titleEvent.includes(titleService) && timeTest) {//Es el evento y coincide la hora
        answer = [titleEvent, titleEvent.slice(titleService.length)]
        answer.push(getEmailSanctioned(event.getGuestList(), service, date, fullHour))
        answer.push(findSanction(service, answer[2])[0])
        break
      }
    }
    return answer

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
      const guestAmount = guestList.length
      const rawAlwaysInvitedService = getDataActives('13')
      const alwaysInvitedService = rawAlwaysInvitedService.map(guests => guests.split())
      const guestsNumberService = alwaysInvitedService.map(guests => guests.length + 1)
      const testService = guestAmount == guestsNumberService[service]
      if (testService) {//Caso ideal, solo 1 invitado
        const alwaysInvited = [...new Set(rawAlwaysInvitedService.join().split().map(email => email.trim()))]
        guestList.forEach((guest) => {
          const guestEmail = guest.getEmail()
          emailSanctioned = !alwaysInvited.includes(guestEmail) ? guestEmail : emailSanctioned
        })
      } else {//Hay más invitados, se busca en el historial
        const sheetsProfessionals = getDataActives('3')
        const dateHistory = SpreadsheetApp.openById('17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY')
        const historySheet = dateHistory.getSheetByName(sheetsProfessionals[service])
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
  }

  function penalize(toRead) {//Sancionar, toRead = [servicio, correo, hora, nombre, fecha]
    const [service, emailSanctioned, hour, name, date] = toRead
    const sanctionedDate = dateFormat(date)
    const historyData = findSanction(service, emailSanctioned)
    const timesSanctioned = historyData[0]
    const limiteTimesSanctioned = getDataActives('25').map(Number)
    if (timesSanctioned >= limiteTimesSanctioned[service]) return 1 //Sancionado permanentemente

    const currentSanctioned = penaltyHistory.getSheetByName('LISTA TEMPORAL')
    const currentData = findCurrent(service, emailSanctioned)
    const availableSanction = currentData[0]
    if (availableSanction) return 2 //Tiene una sanción vigente

    //Añadir al historial o sumar
    const dataSanctioned = [[name, emailSanctioned]]
    const isThere = historyData.length 
    let lastRow = isThere > 1 ? historyData[1] : sanctionedHistory.getLastRow()
    const timesColumn = columnsPenaltyHistory[service][0]
    const newTimesSanctioned = timesSanctioned + 1
    const columnDate = timesSanctioned == 0 ? timesColumn + 1 : timesColumn + newTimesSanctioned
    if (isThere == 1) {
      sanctionedHistory.insertRowAfter(lastRow)
      lastRow++
    }
    sanctionedHistory.getRange(`A${lastRow}:B${lastRow}`).setValues(dataSanctioned)
    sanctionedHistory.getRange(lastRow, columnsPenaltyHistory[service][0]).setValue(newTimesSanctioned)
    sanctionedHistory.getRange(lastRow, columnDate).setValue(sanctionedDate)
    let currentLastRow = currentSanctioned.getLastRow()
    if (currentData.length == 2) {//Tiene una sanción con otro servicio, se recupera esa fila
      currentLastRow = currentData[1] - 1
    } else if (currentLastRow != 1) currentSanctioned.insertRowAfter(currentLastRow)
    currentLastRow++
    currentSanctioned.getRange(`A${currentLastRow}:B${currentLastRow}`).setValues(dataSanctioned)
    const sanctionsPeriods = getDataActives('27').map(days => JSON.parse(days))
    const data = [[sanctionedDate, hour, sanctionsPeriods[service][timesSanctioned]]]
    const serviceColumn = columnsPenaltyHistory[service][1]
    currentSanctioned.getRange(currentLastRow, serviceColumn, 1, 3).setValues(data)
    return 3 //Sanción con exito
    
    function findCurrent(service, email) {//Datos sanción vigente
      const serviceColumn = columnsPenaltyHistory[service][1]
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
    function dateFormat(fullDate) {//Cambiar formato fecha 
      const date = new Date(fullDate)
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
    }
  }
