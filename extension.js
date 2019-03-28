// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const parser = require('./parser/csharp');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable1 = vscode.commands.registerCommand('extension.typesharp.convert', function () {
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
            const members = parsed.members && parsed.members.length > 0 ? parsed.members : flatMap(parsed.namespace_blocks, namespace => namespace.members);
            const memberOutputs = members.map(c => createMemberOutput(c, true));

            if(!isTypeScript) {
                var outputs = memberOutputs.join('\n');
                vscode.workspace.openTextDocument({ language:'typescript', content: outputs })
                    .then(doc => vscode.window.showTextDocument(doc, editor.viewColumn + 1));
                return;
            }

            editor.edit(builder => {
                const document = editor.document;
                const lastLine = document.lineAt(document.lineCount - 1);
    
                const start = new vscode.Position(0, 0);
                const end = new vscode.Position(document.lineCount - 1, lastLine.text.length);
    
                builder.replace(new vscode.Range(start, end), memberOutputs.join('\n'));
            }); 
        } catch (error) {
            console.log(error);
            const message = error.name === 'SyntaxError' ? `${error.message}\nline: ${error.location.start.line}, column: ${error.location.start.column}` 
                        : (error.message || error);
            
            vscode.window.showInformationMessage(message);
        }
    });

    let disposable2 = vscode.commands.registerCommand('extension.typesharp.open', function () {
        const panel = vscode.window.createWebviewPanel(
            'typeSharp',
            'TypeSharp',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                // Only allow the webview to access resources in our extension's media directory
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
            }
          );
    
        const indexFilePath = vscode.Uri.file(path.join(context.extensionPath, 'views', 'index.html'));
        panel.webview.html = fs.readFileSync(indexFilePath.fsPath, 'utf8');

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => handleMessage(panel.webview, message),
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable1);
    context.subscriptions.push(disposable2);
}

function handleMessage(context, message) {
    switch (message.command) {
        case 'open.filePicker':
            {
                const options = {
                    canSelectMany: true,
                    openLabel: 'Open',
                    filters: {
                       'C# files': ['cs'],
                       'All files': ['*']
                   }
               };
           
                vscode.window.showOpenDialog(options).then(fileUri => {
                    context.postMessage({
                        command: 'update.fileList',
                        data: fileUri
                    })
                });
            }
            return;
    }
}

function createMemberOutput(member, outputTs) {
    if(member.type === 'class') {
        return createClassOutput(member, outputTs);
    }

    if(member.type === 'enum' && outputTs) {
        return createEnumOutput(member);
    }

    return '';
}

function createClassOutput(c, outputTs) {
    const properties = c.members.filter(m => m.type === 'property' && m.modifiers);
    const propertyOuts = properties.map(p => createPropertyOutput(p, outputTs));

    return `export class ${c.name} {\n${TAB}${propertyOuts.join(`\n${TAB}`)}\n}`
}

function createPropertyOutput(property, outputTs) {
    return outputTs ? `${property.name} : ${createTypeOutput(property.return_type)};` : property.name + ';';
}

function createTypeOutput(type) {
    if(type.is_array) {
        return `${createTypeOutput(type.base_type)}${type.arrays.map(() => '[]').join('')}`
    }

    if(!type.is_generic) {
        return checkTypeName(type.name);
    }

    const typeName = checkTypeName(type.base_type.name);
    const output = `${typeName}<${type.generic_parameters.map(parameter => createTypeOutput(parameter)).join(',')}>`

    return output;
}

function createEnumOutput(e) {
    const memberOuts = e.members.map(p => createEnumMemberOutput(p));
    return `export enum ${e.name} {\n${TAB}${memberOuts.join(`,\n${TAB}`)}\n}`
}

function createEnumMemberOutput(member) {
    return member.value == null ? member.name : `${member.name} = ${member.value}`
}

function checkTypeName(name) {
    return typeNameMappings[name] || name;
}

const TAB = '    '

const flatMap = (xs, f) =>
  xs.reduce((acc,x) =>
    acc.concat(f(x)), []);

const typeNameMappings = {
    'short' :'number',
    'Short' :'number',
    'int' :'number',
    'Int16' :'number',
    'Int32' :'number',
    'Int64' :'number',
    'double' :'number',
    'Double' :'number',
    'decimal' :'number',
    'Decimal' :'number',
    'float' :'number',
    'Float' :'number',
    'long' :'number',
    'Long' :'number',

    'bool' :'boolean',
    'Boolean' :'boolean',
    'DateTime' :'Date',
    'Task' : 'Promise',

    'IEnumerable' :'Array',
    'ICollection' :'Array',
    'IList' :'Array',
    'List' :'Array',
    'HashSet' :'Array',
    'DbSet' :'Array',
    'Dictionary' :'Map',
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
