//Constantes necesarias
const penaltyHistory = SpreadsheetApp.openById('1xLGkqFusH6L2tumVxuWYjkwS1XtRKZF8gyt53RlaytU');
const sanctionedHistory = penaltyHistory.getSheetByName('LISTA TEMPORAL');
const dayCells = ['E', 'H', 'K', 'N'];
//Funciones
function getData(column){//Obtener días faltantes
  return sanctionedHistory.getRange(column + '2:' + column).getValues().flat();
}
function subtractDay(){//Restar uno cada día
  let lastRow = sanctionedHistory.getLastRow();
  if(lastRow > 1){//Verifica si hay sanciones vigentes
    let data = [getData('E'), getData('H'), getData('K'), getData('N')];//Obtener datos
    let size = data[0].length;//# sanciones vigentes
    for (let i = 0; i < size; i++) {//Fila. Recorre restando 1 a todo
      for (let j = 0; j < 4;j++) {//Columna
        if(data[j][i] > 0){
          data[j][i] = data[j][i] - 1;
          sanctionedHistory.getRange(dayCells[j] + (i + 2)).setValue(data[j][i]);
        }
      }
      if (data[0][i] + data[1][i] + data[2][i] + data[3][i] == 0) {//Si el total de los data es 0, limpiar la fila
        let row = i + 2;
        sanctionedHistory.getRange(`${row}:${row}`).clearContent();
      }
    }
    sanctionedHistory.getRange('A2:Q' + lastRow).sort({column: 1, descending: true});//Organizar
    for(let i = size; i > 1; i--) {
      let row = i + 1;
      if(sanctionedHistory.getRange('A' + row).getValue() == ''){//Eliminar si es vacío
        sanctionedHistory.deleteRow(row);
      }
    }
  }
}