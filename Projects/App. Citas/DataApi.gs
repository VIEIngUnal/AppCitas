function doGet(e) {//Enviar datos de section o calendario
    const codeService = e.parameter.code //XY X, service. Y, action.
    const serviceIndex = parseInt(codeService[0])
    //Base de datos
    const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc')
    const appData = dataBase.getSheetByName('App. Citas')
    const emailProfessional = appData.getRange(5, serviceIndex).getValue()
    const serviceWeeks = appData.getRange(9, serviceIndex).getValue()
    const dateDuration = (appData.getRange(11, serviceIndex).getValue() / 60)
    //Constantes útiles
    const oneDayMilis = 24 * 60 * 60 * 1000
    const daysEvents = serviceWeeks * 7 - 1
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    const calendar = CalendarApp.getCalendarById(emailProfessional)
    const [hours, modalitySchedule] = getDataSchedule()
    const fullHours = createHours()
    const hoursSchedule = createSchedule()
    const slots = hoursSchedule[0].length
    //Enviar información
    const action = codeService[1]
    if (action === '2') return getServiceData()
    if (action === '3') return getCurrentSchedule()
    return getServiceText()
    //Funciones
    function getDataSchedule() {//Horas y modalidades
      const rawData = dataBase.getSheetByName('Horarios').getRange(1, 6 * serviceIndex - 5).getValue()
      const [hours, daysSchedule] = JSON.parse(rawData)
      while (!daysSchedule.slice(-1)[0].filter(Boolean).length) daysSchedule.pop()
      return [hours, daysSchedule]
    }
    function createHours() {//Convierte las horas a formato THH:MMM:SSHH:MM AA -> T13:00:0001:00 p.m.
      return hours.map(simpleHour => {
        const isNotAfternoon = simpleHour.endsWith('a.m.') || simpleHour.startsWith('12')
        const hourMinutes = isNotAfternoon ? simpleHour.slice(0, 5) : parseInt(simpleHour.slice(0, 2)) + 12 + simpleHour.slice(2, 5)
        return `T${hourMinutes}:00${simpleHour}`
      })
    }
    function createSchedule() {//Rellena con valores asociados a las horas cada día
      const schedule = modalitySchedule.map(row => row.map(() => 0))
      modalitySchedule.forEach((day, dayIndex) => {
        fullHours.forEach((hourString, slotIndex) => {
          if (day[slotIndex]) {
            const [hour, minute] = [parseFloat(hourString.slice(1, 3)), parseFloat(hourString.slice(4, 6))]
            schedule[dayIndex][slotIndex] = hour + (minute / 60)
          }
        })
      })
      return schedule
    }
    function getServiceData() {//Horario, elementos HTML del section
      const serviceData = []
      const [sectionTitle, elementsHTML] = getSectionData()
      serviceData.push(hours) //0
      serviceData.push(modalitySchedule) //1
      serviceData.push(caseOfModality()) //2
      serviceData.push(sectionTitle) //3
      serviceData.push(elementsHTML) //4
      console.log(serviceData)
      return arrayToJSON(serviceData)
    }
    function getSectionData() {
      const rawData = appData.getRange(19, serviceIndex).getValue()
      return JSON.parse(rawData)
    }
    function caseOfModality() {//Tipo de modalidad, virtual, presencial o ambas
      const onlyVirtual = modalitySchedule.some(element => element.includes(1))
      const onlyFace = modalitySchedule.some(element => element.includes(2))
      return onlyVirtual && !onlyFace ? 1 : !onlyVirtual && onlyFace ? 2 : 3
    }
    function arrayToJSON(array) {
      const textOutput = ContentService.createTextOutput(JSON.stringify(array))
      return textOutput.setMimeType(ContentService.MimeType.JSON)
    }
    function getCurrentSchedule() {//Horario disponible
      const currentSchedule = []
      const transitoryDate = new Date()
      const dateToday = new Date()
      const dayToday = transitoryDate.getDay()
      transitoryDate.setMilliseconds(dayToday == 6 ? oneDayMilis : -dayToday * oneDayMilis) //Si es sábado siga al domingo, si no, volver al domingo
      const lastDate = new Date(transitoryDate.getTime() + (daysEvents * 24 * 60 * 60 * 1000)) //Sábado en la 3ra semana
      const events = calendar.getEvents(transitoryDate, lastDate) //Eventos en 3 semanas
      for (let weekIndex = 0; weekIndex < serviceWeeks; weekIndex++) {//Para 3 semanas
        getWeekSchedule(currentSchedule, transitoryDate, dateToday, events)
        transitoryDate.setDate(transitoryDate.getDate() + (7 - modalitySchedule.length)) //Transición a siguiente semana
      }
      console.log(currentSchedule)
      return arrayToJSON(currentSchedule)
    }
    function getWeekSchedule(currentSchedule, transitoryDate, dateToday, events) {//Obtiene el horario por semana
      for (let day = 0; day < hoursSchedule.length; day++) {//Recorre cada día
        transitoryDate.setMilliseconds(oneDayMilis)//Siguiente
        const fullDate = getFullDate(transitoryDate, true)
        currentSchedule.push(fullDate)
        const modalitiesDay = modalitySchedule[day] //Obtener modalidades
        if (!modalitiesDay.filter(Boolean).length) continue
        const hoursDay = hoursSchedule[day] //Obtener franjas horarias
        const validHours = hoursDay.filter(Boolean)
        const sameDate = transitoryDate.getDate() == dateToday.getDate()
        const sameMonth = transitoryDate.getMonth() == dateToday.getMonth()
        const isToday = sameDate && sameMonth
        const hourBeforehand = dateToday.getHours() + (dateToday.getMinutes() / 60) + 1
        const isInHours = hourBeforehand < (validHours[validHours.length - 1])
        if (transitoryDate.getTime() > dateToday.getTime() || (isToday && isInHours)) { //Fecha y hora validas
          slotsValidation(currentSchedule, hoursDay, modalitiesDay, events, isToday, hourBeforehand, fullDate, transitoryDate)
        }
      }
    }
    function getFullDate(date, caseDate) {//Obtener fecha en formatos distintos
      const day = String(date.getDate()).padStart(2, '0')
      const month = date.getMonth()
      const year = date.getFullYear()
      if (caseDate) return `${day}/${months[month]}/${year - 2000}`
      const monthFormatted = String(month + 1).padStart(2, '0')
      return `${year}-${monthFormatted}-${day}`
    }
    function slotsValidation(currentSchedule, hoursDay, modalitiesDay, events, isToday, hourBeforehand, fullDate, transitoryDate) {
      for (let slot = 0; slot < slots; slot++) {//Recorre los valores de hora
        const startTime = hoursDay[slot]
        if (startTime) {//Franja valida
          const endTime = startTime + dateDuration
          if (isToday && hourBeforehand > startTime) {//Hoy, pero tarde para esa franja
            currentSchedule.push(0)
            continue
          }
          let emptySlot = true
          for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {//Recorre los eventos
            const event = events[eventIndex]
            const startEventMilis = event.getStartTime()
            const sameDay = startEventMilis.getDate() == transitoryDate.getDate()
            const sameMont = startEventMilis.getMonth() == transitoryDate.getMonth()
            if (sameDay && sameMont) {//Evento evaluable
              const endEventMilis = event.getEndTime()
              const startEvent = startEventMilis.getHours() + (startEventMilis.getMinutes() / 60)
              const endEvent = endEventMilis.getHours() + (endEventMilis.getMinutes() / 60)
              const firstCase = startTime >= startEvent && startTime < endEvent //* | * |
              const secondCase = endTime > startEvent && endTime <= endEvent //| * | *
              const thirdCase = startEvent > startTime && endEvent < endTime //| * * |
              if (firstCase || secondCase || thirdCase) {
                emptySlot = false
                currentSchedule.push(0) 
                break
              }
            }
          }
          if (emptySlot) {
            const modality = modalitiesDay[slot] == 1 ? 'V' : 'P'
            currentSchedule.push(fullDate + getFullDate(transitoryDate, false) + fullHours[slot] + modality)
          }
        }
      }
    }
    function getServiceText() {
      const serviceText = appData.getRange(1, serviceIndex).getValue()
      return arrayToJSON(serviceText)
    }
  }
