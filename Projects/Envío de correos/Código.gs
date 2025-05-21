const quantityError = HtmlService.createHtmlOutput('<p>No se especificó la <b>Cantidad</b> de correos a crear.</p>')
const teamError = HtmlService.createHtmlOutput('<p>No se especificaron los correos del <b>Equipo</b>.</p>')
const subjectError = HtmlService.createHtmlOutput('<p>No se especificó el <b>Asunto</b> del correo.</p>')
const sheet = SpreadsheetApp.getActiveSheet()
const ui = SpreadsheetApp.getUi()
const regex = /<([^>]+)>/g
var quantityToCreate
var teamEmails
var subject
//Funciones
function createOptionsMenu() {
  ui.createMenu('Opciones').addItem('Crear Correos', 'createDraft').addToUi()
}

function contentValidation() {
  quantityToCreate = sheet.getRange('C4').getValue()
  subject = sheet.getRange('C2').getValue()
  teamEmails = sheet.getRange('B1').getValue()
  let errorMsg = !quantityToCreate ? quantityError : !subject ? subjectError : !teamEmails? teamError : 0
  if (errorMsg) ui.showModalDialog(errorMsg, 'ERROR')
  return errorMsg
}

function createDraft() {
  if (contentValidation()) return
  let ccosRange = sheet.getRange('H1')
  let idRange = sheet.getRange('C3')
  let idTest = idRange.getValue()
  let id = idTest ? idTest : searchEmail(subject)
  idRange.setValue(id)
  let messaje = GmailApp.getMessageById(id)
  let body = messaje.getBody()
  let rawCcos = messaje.getBcc()
  let attachments = messaje.getAttachments()
  let ccos = []
  let match
  while ((match = regex.exec(rawCcos)) !== null) ccos.push(match[1])
  ccos = ccos.join()
  if (!ccosRange.getValue()) ccosRange.setValue(ccos)
  while (quantityToCreate) {
    GmailApp.createDraft('vinnyext_fibog@unal.edu.co', subject, '',{
    htmlBody: body,
    bcc: teamEmails,
    attachments: attachments
    })
    quantityToCreate--
  }
}

function searchEmail(drawSubject) {
  const messages = GmailApp.search(`"${drawSubject}"`)
  for (let indexMessage = 0; indexMessage < messages.length; indexMessage++) {
    const message = messages[indexMessage].getMessages()[0]
    if (message.getSubject() == drawSubject) return message.getId()
  }
}
