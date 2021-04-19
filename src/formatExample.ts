import { formatText } from './format/formatText'
import { lintText } from './lint'

const content = `%put 'Hello';   
%put 'World'; 
%macro somemacro()
  %put 'test';
%mend;\r\n`

console.log(content)
lintText(content).then((diagnostics) => {
  console.log('Before Formatting:')
  console.table(diagnostics)
  formatText(content).then((formattedText) => {
    lintText(formattedText).then((newDiagnostics) => {
      console.log('After Formatting:')
      console.log(formattedText)
      console.table(newDiagnostics)
    })
  })
})
