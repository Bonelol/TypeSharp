// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const prettier = require('prettier');
const util = require('./util');
const parser = require('./parser/csharp');

function registerConvertCommand(context) {
    return vscode.commands.registerCommand('extension.typesharp.convert', function () {
        const editor = vscode.window.activeTextEditor;

        if(!editor){
            return;
        }

        const content = editor.document.getText();

        if(!content){
            return;
        }
        
        const language = vscode.window.activeTextEditor.document.languageId;
        const isTypeScript = language === 'typescript';
        // const isJavaScript = language === 'javascript';

        // if(!isTypeScript && !isJavaScript) {
        //     return;
        // }

        try {
            const parsed = parser.parse(content);
            const config = util.getConfiguration();
            const outputOptions = {
                outputTs: true,
                interface: config.classToInterface,
                convention: config.propertyConvention,
                optional: config.optionalField
            }
            const members = parsed.members && parsed.members.length > 0 ? parsed.members : util.flatMap(parsed.namespace_blocks, namespace => namespace.members);
            const memberOutputs = members.map(c => util.createMemberOutput(c, outputOptions));

            let output = memberOutputs.join('\n');

            if(config.prettier){
              output = prettier.format(output);
            }

            if(config.newWindow) {
                vscode.workspace.openTextDocument({ language:'typescript', content: output })
                    .then(doc => vscode.window.showTextDocument(doc, editor.viewColumn + 1));
                return;
            }

            editor.edit(builder => {
                const document = editor.document;
                const lastLine = document.lineAt(document.lineCount - 1);
    
                const start = new vscode.Position(0, 0);
                const end = new vscode.Position(document.lineCount - 1, lastLine.text.length);
    
                builder.replace(new vscode.Range(start, end), output);
            }); 
        } catch (error) {
            console.log(error);
            const message = error.name === 'SyntaxError' ? `${error.message}\nline: ${error.location.start.line}, column: ${error.location.start.column}` 
                        : (error.message || error);
            
            vscode.window.showInformationMessage(message);
        }
    });
}

module.exports = registerConvertCommand;
  