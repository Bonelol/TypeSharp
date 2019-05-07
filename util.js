const flatMap = (xs, f) =>
  xs.reduce((acc,x) =>
    acc.concat(f(x)), []);

const TAB = '    '

function createMemberOutput(member, options) {
    if(member.type === 'class') {
        return createClassOutput(member, options);
    }

    if(member.type === 'enum' && options) {
        return createEnumOutput(member);
    }

    return '';
}

function createClassOutput(c, options) {
    const properties = c.members.filter(m => m.type === 'property' && m.modifiers);
    const propertyOuts = properties.map(p => createPropertyOutput(p, options));
    const exportType = options.interface ? 'interface' : 'class'

    return `export ${exportType} ${c.name} {\n${TAB}${propertyOuts.join(`\n${TAB}`)}\n}`
}

function createPropertyOutput(property, options) {
    let name = property.name;

    if (options.convention === 'camel') {
        name = name.replace(/\w+/g,
            function(w){return w[0].toLowerCase() + w.slice(1);})
    } else if (options.convention === 'pascal') {
        name = name.replace(/\w+/g,
            function(w){return w[0].toUpperCase() + w.slice(1);})
    }

    return options.outputTs ? `${name} : ${createTypeOutput(property.return_type)};` : name + ';';
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

module.exports = {
    flatMap: flatMap,
    createMemberOutput: createMemberOutput
};