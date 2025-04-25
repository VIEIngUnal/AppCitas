//Base de datos
const dateHistory = SpreadsheetApp.getActiveSpreadsheet()
const consolidatedSheet = dateHistory.getSheetByName('Consolidado')
const isThereFilter = consolidatedSheet.getRange('1:1').getFilter()
const totalRows = consolidatedSheet.getMaxRows()
const serviceNames = dataBase.getRange('1:1').getValues().flat()
const sheetsName = dataBase.getRange('3:3').getValues().flat()
const rawCategories = dataBase.getRange('29:29').getValues().flat().map((array) => JSON.parse(array))
const categoriesColumn = dataBase.getRange('31:31').getValues().flat()
const servicesCategories = []
rawCategories.forEach((categories) => categories.forEach((category) => servicesCategories.push(category)))
//Funciones
function isDecember() { //Hace un consolidado el ultimo día del año a las 23:00 horas
  const month = (new Date()).getMonth()
  if(month == 11) createConsolidated()
}

function createConsolidated() { //Crea el consolidado de citas en el historial
  consolidatedSheet.setFrozenRows(0) //Se descongela la primera fila para eliminar todas las demás
  if (isThereFilter) isThereFilter.remove() //Elimina los filtros
  if (totalRows > 1) consolidatedSheet.deleteRows(2, totalRows - 1)
  //Recorre todas las hojas y organiza en el consolidado
  let rowCounter = 1
  for(let indexSheet = 0; indexSheet < sheetsName.length; indexSheet++) {
    const sheetService = dateHistory.getSheetByName(sheetsName[indexSheet])
    let serviceData = sheetService.getRange('A4:M').getDisplayValues() //Se obtienen los datos por hoja
    //Elimina filas vacias
    serviceData = serviceData.filter(subarray => {return subarray.some(item => item.trim() !== '')})
    const startCell = rowCounter + 1
    const newRows = serviceData.length
    if (!newRows) continue //Si está vacío pase al siguiente servicio
    consolidatedSheet.insertRowsAfter(rowCounter, newRows)
    consolidatedSheet.getRange(`A${startCell}:M`).setValues(serviceData)
    consolidatedSheet.getRange(`O${startCell}:O`).setValue(serviceNames[indexSheet])
    rowCounter += newRows
    const typeServiceRange = `N${startCell}:N`
    const categoryService = categoriesColumn[indexSheet]
    if (!categoryService) {
      consolidatedSheet.getRange(typeServiceRange).setValue('Otro')
      continue
    }
    const rawCategories = sheetService.getRange(`${categoryService}4:${categoryService}`).getValues()
    const categories = rawCategories.map((category) => {
      return category.map((text) => servicesCategories.includes(text) ? text : 'Otro')
    })
    consolidatedSheet.getRange(typeServiceRange).setValues(categories)
  }
  consolidatedSheet.setFrozenRows(1)
  consolidatedSheet.getRange('A:O').createFilter()
}
