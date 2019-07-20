# TypeSharp

Convert C# POCOs to TypeScript

## How to use

In editor window press CTL+ALT+T OR run command 'Convert C# to TypeScript'. To convert multiple files, run command 'Open TypeSharp convert window'

![animation](https://raw.githubusercontent.com/Bonelol/TypeSharp/master/images/animation.gif)

Convert multiple files  
![multi](https://raw.githubusercontent.com/Bonelol/TypeSharp/master/images/animation2.gif)

## Requirements

To generate parser, you will need [PEG.js](https://pegjs.org/).

## Known Issues

N/A

## Release Notes

### [0.3.0] - 2019-07-20

- Fix constructor parsing issue
- Fix camel case issue
- Add an option to generate all fields as optional
- Support nullable fields

### [0.2.0] - 2019-05-15

- Add settings

### [0.1.2] - 2019-05-10

- Support converting c# classes to interfaces

### [0.1.0] - 2019-05-07

- Support convert multiple files. Run command 'Open TypeSharp convert window'

### [0.0.3] - 2019-03-28

- Support enums
- Support initializers (property and field) 
- Supoort calling base constructor
- Support lambda expression in properties
- Fix bugs

### [0.0.2] - 2019-03-27

- Initial release
