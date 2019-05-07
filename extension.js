const registerConvertCommand = require('./single');
const registerOpenCommand = require('./multi');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable1 = registerConvertCommand(context);
    context.subscriptions.push(disposable1);
    
    let disposable2 = registerOpenCommand(context);
    context.subscriptions.push(disposable2);
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
