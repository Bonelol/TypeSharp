{
    function createList(head, tail) {
        var result = [head];
        for (var i = 0; i < tail.length; i++) {
            result.push(tail[i][3]);
        }
        return result;
    }

    function isEvent(modifiers) {
        return modifiers && modifiers.includes('event');
    }

    function isDelegate(modifiers) {
        return modifiers && modifiers.includes('delegate');
    }
}

start 
= u:using_statments? __ n:namespace_block (__ namespace_block)* EOL {
    return {
        using_statments: u,
        namespace_blocks: [n]
    }
}

comments_list
= comments (__ comments)*

comments
= xml_comments
/ single_line_comments
/ multi_line_comments

single_line_comments
= '//' [^\n\r]* EOL

multi_line_comments
= '/*' (!"*/" .)* '*/'

xml_comments
= '///' [^\n\r]* EOL

using_statments
= head:using_statment tail:(__ using_statment)* {
    return [head].concat(tail.map(t => t[1]))
}

using_statment
= 'using' __ parts:[A-Za-z0-9_.]* __? SEMICOLON {
    return parts.join('');
}

namespace_block
= 'namespace' __ parts:[A-Za-z0-9_.]*
__ LBRACE
__ classes:class_definition*
__ RBRACE {
    return {
        namespace: parts.join(''),
        classes: classes
    }
}

attribute_list
= a:(__ attributes)* {
    return a.map(b=>b[1]).reduce((accumulator, currentValue) => { return currentValue.concat(accumulator); } , [])
}

attributes = LBRAKE __ head:attribute tail:(__ COMMA __ attribute)* __ RBRAKE {
    return createList(head, tail)
}

attribute
= n:attribute_name p:(__ LPAREN __ attribute_parameters? __ RPAREN)? {
    return {
        name: n,
        parameters: (p && p.length === 6) ? p[3] : null,
        type: 'attribute'
    }
}

attribute_name
= parts:[A-Za-z0-9_.]* {
    return parts.join('')
}

attribute_parameters
= head:attribute_parameter tail:(__ COMMA __ attribute_parameter)* {
    return createList(head, tail)
}

attribute_parameter
= parts:[A-Za-z0-9_]* __ EQUALS __ v:attribute_parameter_value {
    return {
        name: parts.join(''),
        value: v
    }
}
/ v:attribute_parameter_value {
    return {
        name: null,
        value: v
    }
}

attribute_parameter_value
= TRUE
/ FALSE
/ NULL
/ number:number+ { return number.join('') }
/ string

string
=  QUOTE parts:[^"]* QUOTE  { return '"' + parts.join('') + '"' }

class_definition
= a:attribute_list? 
__ m:modifiers?
__ p:partial?
__ 'class' 
__ n:class_name
__ g:class_generic_parameters?
__ i:implemented_types?
__ t:type_constraints?
__ LBRACE
__ members:class_member*
__ RBRACE {
    return {
        attributes: a,
        modifiers: m,
        name: n,
        generic_parameters: g,
        implemented_types: i,
        type_constraints: t,
        members: members,
        partial: p === 'partial' ? true :false,
        type: 'class'
    }
}

class_name
= parts:[A-Za-z0-9_]* {
    return parts.join('')
}

class_generic_parameters
= LESS_THAN __ head:type tail:(__ COMMA __ type)*  __ GREATER_THAN {
    return createList(head, tail)
}

implemented_types = COLON __ head:type tail:(__ COMMA __ type)* {
    return createList(head, tail)
}

class_member
= property_definition
/ method_definition
/ field_definition

constructor_definition
= __ a:attribute_list?
__ m:modifiers?
__ n:class_name
__ g:method_generic_parameters?
__ LPAREN __ params:method_parameters __ RPAREN
__ t:type_constraints?
__ d:block? {
    return {
        attributes: a,
        modifiers: m,
        name:n,
        parameters: params,
        generic_parameters: g,
        type_constraints: t,
        type: 'constructor'
    }
}

field_definition
= __ a:attribute_list?
__ m:modifiers?
__ r:return_type
__ n:field_name
__ SEMICOLON {
    return {
        attributes: a,
        modifiers: m,
        return_type:r,
        name:n,
        type: isEvent(m) ? 'event' : 'field'
    }
}

field_name
= parts:[A-Za-z0-9_.]* {
    return parts.join('')
}

property_definition
=  __ a:attribute_list?
__ m:modifiers?
__ r:return_type
__ n:property_name
__ l:((LBRACE __ accessor_list __ RBRACE)) {
    return {
        attributes: a,
        modifiers: m,
        return_type:r,
        name:n,
        accessor_list:l[2],
        type: 'property'
    }
}

property_name
= parts:[A-Za-z0-9_.]* {
    return parts.join('')
}

accessor_list
= head:accessor __? tail:accessor? {
    return tail ? [head, tail] : [head]
}

accessor
= ak:accessor_keyword __ d:block? __ SEMICOLON? {
    return {
        accessor_keyword: ak,        
        definition:d
    }
}

accessor_keyword = 'get' / 'set'

method_definition
=  __ a:attribute_list?
__ m:modifiers?
__ p:partial?
__ r:return_type
__ n:method_name
__ g:method_generic_parameters?
__ LPAREN __ params:method_parameters __ RPAREN
__ t:type_constraints?
__ s:SEMICOLON?
__ d:block? {
    return {
        attributes: a,
        modifiers: m,
        return_type:r,
        name:n,
        parameters: params,
        generic_parameters: g,
        type_constraints: t,
        partial: p === 'partial' ? true :false,
        type: isDelegate(m) ? 'delegate' : 'method'
    }
}

method_name = parts:[A-Za-z0-9_.]* {
    return parts.join('')
}

method_generic_parameters
= LESS_THAN __ head:type tail:(__ COMMA __ type)*  __ GREATER_THAN {
    return createList(head, tail)
}

method_parameters
= head:method_parameter? tail:(__ COMMA __ method_parameter)* {
    return createList(head, tail)
}

method_parameter_keywords
= 'params'
/ 'in'
/ 'out'
/ 'ref'
/ 'this'

method_parameter
= a:attribute_list? 
__ k:method_parameter_keywords? 
__ t:type
__ parts:[A-Za-z0-9_]* {
    return {
        attributes: a,
        type:t,
        name:parts.join(''),
        method_parameter_keyword: k
    }
}

block = LBRACE __ head:block_head __ tail:(block_tail)* __ RBRACE {
    return head + tail.join('')
}

block_head = parts:[^{}]* {
    return parts.join('')
}

block_tail = block:block __ parts:[^{}]* {
    return block + parts.join('')
}

return_type
= type

type = array_type
/ generic_type
/ non_generic_type

array_type
= t:generic_type __ a:array_syntax __ q:QUESTION_MARK? {
    return {
        base_type: t,
        is_array: true,
        is_nullable: q ? true : false,
        arrays: a,
        name: t.name + a.map(i => '[]').join('')
    }
}
/ t:non_generic_type __ a:array_syntax __ q:QUESTION_MARK? {
    return {
        base_type: t,
        is_array: true,
        is_nullable: q ? true : false,
        arrays: a,
        name: t.name + a.map(i => '[]').join('')
    }
}

array_syntax
= array_syntax_jagged
/ array_syntax_d

array_syntax_d
= LBRAKE __ d:(COMMA __)* RBRAKE {
    return {
        type: 'array',
        dimension: d.length + 1
    }
}

array_syntax_jagged
= a:(array_syntax_d __)+ {
    return a.map(m => m[0])
}

generic_type
= type:non_generic_type LESS_THAN head:(type) tail:(__ COMMA __ type)* GREATER_THAN __ q:QUESTION_MARK? {
    const parameters = createList(head, tail);

    return {
        name: type.name + '<' + parameters.map(p=>p.name).join(',') + '>',
        base_type: type,
        generic_parameters: parameters,
        is_generic: true,
        is_nullable: q ? true : false
    }
}

non_generic_type = parts:[A-Za-z0-9_]* __ q:QUESTION_MARK? {
    return {
        name: parts.join(''),
        base_type: null,
        generic_parameters: null,
        is_generic: false,
        is_nullable: q ? true : false
    }
}

type_constraints
= head:type_constraint tail:(__ type_constraint)* {
    return [head].concat(tail.map(t => t[1]))
}

type_constraint
= 'where' __ parts:[A-Za-z0-9_]* __ COLON __ head:type_constraint_arg tail:(__ COMMA __ type_constraint_arg)* {
    return {
        type_constraint: parts.join(''),
        type_constraint_args: createList(head, tail)
    }
}

type_constraint_arg
= 'struct'
/ 'class'
/ 'unmanaged'
/ 'new()'
/ type

access_modifier
= 'public'
/ 'private'
/ 'protected'
/ 'internal'
/ 'protected internal'
/ 'private protected'

modifiers
= head:modifier tail:(__ modifier)* {
    return [head].concat(tail.map(t => t[1]))
}

modifier
= 'abstract'
/ 'async'
/ 'const'
/ 'event'
/ 'extern'
/ 'override'
/ 'readonly'
/ 'sealed'
/ 'static'
/ 'unsafe'
/ 'virtual'
/ 'volatile'
/ access_modifier

partial = 'partial'

identifier
= [A-Za-z0-9_]

number
= [0-9-.]

TRUE = 'true'
FALSE = 'false'
NULL = 'null'

//specail character
DOT           = '.'
COMMA         = ','
STAR          = '*'
COLON         = ':'
SEMICOLON     = ';'
EQUALS        = '='
QUOTE         = '"'
QUESTION_MARK = '?'

LESS_THAN     = '<'
GREATER_THAN  = '>'

LPAREN        = '('
RPAREN        = ')'
    
LBRAKE        = '['
RBRAKE        = ']'
    
LBRACE        = '{'
RBRACE        = '}'

__ =
 whitespace* comments_list? whitespace*

char = .

whitespace =
  [ \t\n\r]

EOL 
  = EOF
  / [\n\r]+
  
EOF = !.