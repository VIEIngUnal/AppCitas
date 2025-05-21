const book = SpreadsheetApp.openById('1ItowGoaaVSlC3BPZbJaYlk2n5XoZInHozLL-XMxreu0')
const sheet = book.getSheetByName('Data')
const currentHistory = SpreadsheetApp.openById('17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY')
const historyColumns = 'GJHLMK'.split('')
const dataBase = SpreadsheetApp.openById('1REbxAvc83wme_uIxwxmjEZvBpSX9Slc0hxfA2S8r5sc')
const appSheet = dataBase.getSheetByName('App. Citas')
const professionals = appSheet.getRange('3:3').getValues().flat().filter(Boolean)
const idExtension = appSheet.getRange('7:7').getValues().flat().filter(Boolean)

function doGet() {
  const allColumns = 'ABCDEFGH'.split('')
  let output = []
  for (let i = 1; i < allColumns.length; i++) {//Limpiar filtros
    sheet.getRange(1,i).getFilter().removeColumnFilterCriteria(i)
  }
  allColumns.forEach(column => output.push(sheet.getRange(`${column}2:${column}`).getValues().flat())) //Datos
  output.push(Array.from({ length: sheet.getMaxRows() - 1 }, (_, i) => i + 2)) //Numero de columna para edits
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON)
}

function getValues(historySheet, column) {
  return historySheet.getRange(`${column}4:${column}`).getValues()
}

function getHistoryValues(professional) {
  const historySheet = currentHistory.getSheetByName(professional)
  return historyColumns.map(column => getValues(historySheet, column))
}

function addData(data) {
  const dataColumns = 'ABCDEH'.split('')
  const lastRow = sheet.getMaxRows()
  const totalNewRows = data[6].reduce((accumulator, current) => accumulator + current, 0)
  sheet.insertRowsAfter(lastRow, totalNewRows)
  let initialRow = lastRow + 1
  dataColumns.forEach((column, columnIndex) => {
    sheet.getRange(`${column}${initialRow}:${column}`).setValues(data[columnIndex])
  })
  const year = (new Date()).getFullYear()
  data[6].forEach((size, indexSize) => {
    const finalRow = initialRow + size - 1
    sheet.getRange(`I${initialRow}:I${finalRow}`).setValue(`${year}${idExtension[indexSize]}`)
    initialRow = initialRow + size
  })
}

function addInformation() {
  //[[Nombres], [Cedulas],	[Correos],	[Relaciones],	[Dependencias], [Telefonos], [Cantidades]]
  let data =[[], [], [], [], [], [], []]
  professionals.forEach(professional => {
    var newDataRows = getHistoryValues(professional) //"var" porque se va a usar afuera del forEach
    newDataRows.forEach((newData, indexData) => data[indexData] = data[indexData].concat(newData))
    data[6] = data[6].concat(newDataRows[0].length) //Cantidad de filas
  })
  addData(data)
}

function accentCleaner() {
  const normalVowels = 'aeiou'
  const accentedVowels = 'áéíóú'
  for (let i = 0; i < 5; i++) sheet.createTextFinder(accentedVowels[i]).replaceAllWith(normalVowels[i])
}

function getLongest(array) {
  let longest = []
  const lengthArray = array.length
  if (!lengthArray) return longest
  for (let i = 0; i < lengthArray; i++) {//Encontrar el nombre más largo
    let newLongest = array[i]
    longest = newLongest.length > longest.length ? [newLongest] : [longest]
  }
  return longest
}

function cleanNames() {
  const namesRange = sheet.getRange('A2:A')
  let allNames = namesRange.getDisplayValues().flat()
  allNames.forEach((name, indexName) => {
    let longestName = getLongest(name.toString().split(', ').filter(Boolean))[0]
    allNames[indexName] = ['']
    if (longestName) {
      longestName = longestName.split(' ').filter(Boolean)
      longestName = longestName.map(namePart => `${namePart[0].toUpperCase()}${namePart.slice(1).toLowerCase()}`)
      longestName = [longestName.join(' ')]
      allNames[indexName] = longestName
    }
  })
  namesRange.setValues(allNames)
}

function cleanEmails() {
  let emails = sheet.getRange('C2:C').getValues().flat()
  emails = emails.map(email => [email.toString().toLowerCase()])
  sheet.getRange('C2:C').setValues(emails)
}

function cleanPhones() {
  const phonesRange = sheet.getRange('H2:H')
  const extsRange = sheet.getRange('G2:G')
  let allPhones = phonesRange.getValues().flat()
  let allExts = extsRange.getValues().flat()
  allPhones.forEach((phones, indexPhones) => {
    let phonesArray = phones.toString().split(', ').filter(Boolean)
    let extsArray = allExts[indexPhones].toString().split(', ').filter(Boolean)
    phonesArray.forEach((phone, indexPhone) => {
      if (phone.length < 6) {
        extsArray.push(phone)
        phones[indexPhone] = ''
      }
    })
    allPhones[indexPhones] = [phonesArray.join(', ')]
    allExts[indexPhones] = [extsArray.join(', ')]
  })
  phonesRange.setValues(allPhones)
  extsRange.setValues(allExts)
}

function dataTester(prevData, nextData) {
  prevData = prevData.toString().split(', ').filter(Boolean)
  nextData = nextData.toString().split(', ').filter(Boolean)
  let nullTestData = prevData.length + nextData.length != 0 //0 equivale a false
  let dataTest = false
  if (nullTestData) {
    for (let i = 0; i < prevData.length; i++) {
      let prevDatum = prevData[i]
      if (nextData.includes(prevDatum)) {//Si alguno se encuentra en el siguiente -> break
        dataTest = true //Se trata de el mismo usuario
        break
      }
    }
  }
  return dataTest && nullTestData
}

function mergeEquals(prev, next) {
  prev.forEach((rawPrevValues, indexPrev) => {
    const prevValues = rawPrevValues.toString().split(', ').filter(Boolean)
    let nextValues = next[indexPrev].toString().split(', ').filter(Boolean)
    prevValues.forEach(prevValue => {
      if (!nextValues.includes(prevValue)) nextValues.push(prevValue)
    })
    next[indexPrev] = nextValues.join(', ')
  })
  return next
}

function deleteBlankRows() {
  //Si bien es un poco lenta, garantiza que se eliminan filas totalmente en blanco
  sheet.sort(1, true) //Organizar por nombre
  let totalRows = sheet.getMaxRows()
  let blankTest = false
  while (!blankTest) {//Mientras hallan filas en blanco
    blankTest = sheet.getRange(`${totalRows}:${totalRows}`).getValues()[0].slice(0,-1).join('') //Fila en blanco
    if (!blankTest) sheet.deleteRow(totalRows) //!'' -> true
    totalRows--
  }
}

function cleanEquals(column) {
  sheet.sort(column, true) //Columna de criterio de orden
  let allData = sheet.getRange(`2:${sheet.getLastRow()}`).getValues() //Todos los datos
  let ccs = sheet.getRange('B2:B').getValues().flat() //Cedulas
  let emails = sheet.getRange('C2:C').getValues().flat() //Correos
  for (let rowIndex = 0; rowIndex < emails.length - 1 ; rowIndex++) {
    let indexDestiny = rowIndex + 1
    let ccTest = dataTester(ccs[rowIndex], ccs[indexDestiny]) //Cedula como criterio
    let emailTest = dataTester(emails[rowIndex], emails[indexDestiny]) //Correo como criterio
    if (ccTest || emailTest) {//Hay datos y coinciden en usuario -> Unir
      const prevValues = allData[rowIndex].flat()
      let nextValues = allData[indexDestiny].flat()
      allData[rowIndex] = Array(9).fill('') //Se deja en limpio el dato previo
      allData[indexDestiny] = mergeEquals(prevValues, nextValues) //Se unen ambos
    }
  }
  sheet.getRange(`2:${sheet.getMaxRows()}`).setValues(allData)
  deleteBlankRows()
}

function cleanMergeAll() {
  accentCleaner() //Eliminar todas las tildes, para evitar desigualdades
  cleanEmails() //Ajuste de correos electronicos
  cleanPhones() //Ajuste de extension y Telefono
  cleanNames() //Ajuste de nombres inicial
  let lastRow = 0
  while (sheet.getLastRow() != lastRow) {//Hasta que deje de cambiar el numero de usuarios
    lastRow = sheet.getLastRow()
    cleanEquals(1) //Unir iguales por nombre
    cleanEquals(2) //Unir iguales por número de identificación
    cleanEquals(3) //Unir iguales por correo electrónico
  }
  cleanNames() //Ajuste de nombres final
  sheet.sort(1, true)
}

function actualization() {
  addInformation()
  cleanMergeAll()
}

// 2022
// Directorio 2022 - 1E5_2Mt8NwDCtNpherEtPzBQugd6tYfk1D1tRi4Nd_zM
// Historial Viviana 2022 - 1daDkDAOlMy0ThBAyltzdyIbiCkF-1bpS_3XmRsKw3xc
// Historial Wilson 2022 - 18d8HehPflZObzxe696qmFesq-X6926c-PfbqGrMVn5o
// Historial Cristian 2022 - 1T2ZwKY7wkDatTQUGvDWEdKcZrnqBdHNJyRL2N1DAVCQ
// 2023
// Historial de citas 2023 - 1AGhOs1BNbsjV4QjAzWP1wgHMwzlcpSBe-IKUJRxDHrY
// 2024 en adelante
// Historial de citas 2024 - 17nhyAQs_x35lO6o0s1k9RQfIsj6bNPm5trM9B-Y7FtY
