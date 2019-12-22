// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');
const parser = require('./parser/csharp');
const fs = require('fs');
const util = require('./util');

function registerOpenCommand(context) {
    return vscode.commands.registerCommand('extension.typesharp.open', function () {
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

        //load configs
        const config = util.getConfiguration();
        panel.webview.postMessage({
            command: 'load.config',
            data: config
        })

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => handleMessage(panel.webview, message),
            undefined,
            context.subscriptions
        );
    });
}

function handleMessage(context, message) {
    switch (message.command) {
        case 'open.folder': {
            let uri = vscode.Uri.file(message.data);
            vscode.commands.executeCommand('revealFileInOS', uri).then(function() {

            });
            return;
        }
        case 'open.filePicker': {
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
            return;
        }
        case 'convert.selectedFiles': {
            console.debug(message.data);
            const options = {
                canSelectFiles: false,
                canSelectFolders:true,
                filters: {
                    'TypeScript files': ['ts'],
                    'All files': ['*']
                }
            };
        
            vscode.window.showOpenDialog(options).then(fileUri => {                
                const path = fileUri[0].fsPath;              
                const outputOptions = {
                    outputTs: true,
                    interface: message.data.interface,
                    convention: message.data.convention,
                    overwrite: message.data.overwrite,
                    optional: message.optional
                }

                handleOpenDialog(context, path, message.data.files, outputOptions);
            });
            return;
        }
    }
}

const handleOpenDialog = (context, path, files, options) => {
    files.forEach(f => {
        f.tsPath = null;
        f.error = null;        
        f.created = false;
    });

    const file_member_map = {};
    const memberName_file_map = {};
    const filePromises = files.map(f => fs.promises.readFile(f.path, 'utf8').then(content => {
        if(content.charCodeAt(0) == 65279) 
            content = content.substr(1);

        const parsed = parser.parse(content);
        const members = parsed.members && parsed.members.length > 0 ? parsed.members : util.flatMap(parsed.namespace_blocks, namespace => namespace.members);

        file_member_map[f.name] = members;
        members.forEach(m => {
            memberName_file_map[m.name] = f;
        })
    }).catch(err=> {
        console.log(err);
        file_member_map[f.name] = [];
        f.error = err;
    }));

    Promise.all(filePromises).then(() => {
        const promises = files.filter(f => !f.error).map(f => {
            const members = file_member_map[f.name];
            const memberOutputs = members.map(c => util.createMemberOutput(c, options));
            const name = getFileNameWithoutExt(f.name);
            const referencedTypes = util.flatMap(members.map(member => findReferencedTypes(member)), m => m);
            const imports = referencedTypes.filter(rt => memberName_file_map[rt])
                                        .map(rt => `import { ${rt} } from './${getFileNameWithoutExt(memberName_file_map[rt].name)}';`)
                                        .join('\n');
            const fileContent = imports + '\n\n' + memberOutputs + '\n\n';
            const filePath = `${path}\\${name}.ts`;

            f.tsPath = filePath;

            return fs.promises.writeFile(filePath, fileContent)
        .then(()=>{
            f.checked = false;
            f.created = true;

            return f;
        }).catch(err=> {
            console.log(err);
            f.error = err;

            return f;
        })});

        Promise.all(promises).then(results => {
            console.log(results);

            context.postMessage({
                command: 'convert.response',
                data: files,
                uri: path
            })
        });   
    }); 
}

const findReferencedTypes = (target) => {
    let types = [];

    if (target.implemented_types) {
        types = types.concat(util.flatMap(target.implemented_types.filter(t => t.name !== target.name).map(t => getAllTypes(t)), m => m));
    }

    if (target.members) {
        const temp = target.members.filter(m => m.type === 'property' && m.return_type.name !== target.name).map(m => getAllTypes(m.return_type));
        types = types.concat(util.flatMap(temp, m => m));
    }

    return [...new Set(types)];
}

const getAllTypes = (target) => {
    let types = [target.name];

    if (target.is_generic) {
        types = types.concat(util.flatMap(target.generic_parameters.map(p => getAllTypes(p)), m => m));        
    }

    if (target.base_type) {
        types = types.concat(getAllTypes(target.base_type))
    }

    if (target.generic_parameters) {
        types = types.concat(util.flatMap(target.generic_parameters.map(gp => getAllTypes(gp)), m => m));
    }

    return [...new Set(types)];
};

const getFileNameWithoutExt = (name) => {
    return name.split('.').slice(0, -1).join('.')
}

module.exports = registerOpenCommand;