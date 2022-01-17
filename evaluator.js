"use strict";

function isLetter(str) {
    return str >= "a" && str <= "z" || str >= "A" && str <= "Z";
}

function isNumber(str) {
    return (str >= "0" && str <= "9") || str == ".";
}

function matchOperator(symbol) {
    for (var i = 0; i < operators.length; i++) {
        if (operators[i].name == symbol) return operators[i];
    }
    return null;
}

function callFunction(name, args, operator = false) {
    //Assume all args are strings. Javascript tries to accept anything, but convert to numbers just in case.
    var moddedArgs = [];
    for (var i = 0; i < args.length; i++) {
        moddedArgs.push(Number(args[i]));
    }
    if (operator) return matchOperator(name).operate(moddedArgs);
    else return functions[name](moddedArgs);
}

function Token(type, name) {
    this.type = type;
    this.name = name;
}

function tokenize(str) {
    var tokens = [];
    var buffer = "";
    var bufferType = 0;
    var bTypeLetters = 1;
    var bTypeNumbers = 2;
    var bTypeOperator = 3;

    function emptyBuffer() {
        if (buffer == "") return;
        else if (bufferType == bTypeOperator || bufferType == bTypeNumbers) {
            var t = new Token((bufferType == bTypeOperator ? "operator" : "number"), buffer);
            tokens.push(t);
        } else if (bufferType == bTypeLetters) {
            for (var i = 0; i < buffer.length; i++) {
                var t = new Token("variable", buffer[i]);
                tokens.push(t);
                if (i != (buffer.length - 1)) {
                    var o = new Token("operator", "*");
                    tokens.push(o);
                }
            }
        } else {
            throw "Invalid token: " + buffer;
        }
        buffer = "";
        bufferType = 0;
    }
    var parenLevel = 0;
    for (var i = 0; i < str.length; i++) {
        if(str[i]==" ")
            continue;
        //Handle everything in parens by just tossing it into a token.
        if (str[i] == "(") {
            parenLevel += 1;
            if (bufferType == bTypeNumbers && parenLevel == 1) {
                var t = new Token("number", buffer);
                var o = new Token("operator", "*");
                tokens.push(t);
                tokens.push(o);
                buffer = "";
                bufferType = 0;
            }
        }
        if (parenLevel > 0) {
            buffer += str[i];
            if (str[i] == ")") parenLevel -= 1;
            if (parenLevel == 0) {
                var expr = false;
                if (buffer[0] == "(" && buffer[(buffer.length - 1)] == ")") {
                    expr = true;
                    buffer = buffer.slice(1, -1); // Remove first and last character.
                }
                var t = new Token((expr == true ? "expression" : "function"), buffer);
                tokens.push(t);
                buffer = "";
                bufferType = 0;
            }
            continue;
        }
        //Throw a syntax error if the character is right paren now, we've already continued from our paren-handling block and so any right paren here means a mismatch.
        if (str[i] == ")") {
            throw "Mismatched parens at character " + (i + 1);
        }
        if (bufferType == bTypeOperator) {
            emptyBuffer();
        }
        if (bufferType == bTypeNumbers) {
            if (matchOperator(str[i]) != null) {
                emptyBuffer();
                var o = new Token("operator", str[i]);
                tokens.push(o);
                continue;
            } else if (isLetter(str[i])) {
                emptyBuffer();
                var o = new Token("operator", "*");
                tokens.push(o);
                buffer += str[i];
                bufferType = bTypeLetters;
                continue;
            } else if (isNumber(str[i])) {
                buffer += str[i];
                bufferType = bTypeNumbers;
                continue;
            }
        } else if (bufferType == bTypeLetters) {
            if (matchOperator(str[i]) != null) {
                emptyBuffer();
                var o = new Token("operator", str[i]);
                tokens.push(o);
                continue;
            } else if (isLetter(str[i])) {
                buffer += str[i];
                bufferType = bTypeLetters;
                continue;
            } else if (isNumber(str[i])) {
                throw "Unexpected number at character " + i;
            }
        } else if (buffer == "") {
            buffer += str[i];
            if (isLetter(str[i])) {
                bufferType = bTypeLetters;
            } else if (isNumber(str[i])) {
                bufferType = bTypeNumbers;
            } else if (matchOperator(str[i]) != null) {
                bufferType = bTypeOperator;
            } else {
                throw "Invalid token at character " + i;
            }
            continue;
        }
    }
    emptyBuffer();
    return tokens;
}

function evaluateFromTokens(tokens) {
    //First loop
    for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].type == "expression") {
            var exprTokens = tokenize(tokens[i].name);
            answer = evaluateFromTokens(exprTokens);
            tokens[i].type = "number";
            tokens[i].name = "" + answer;
            continue;
        } else if (tokens[i].type == "function") {
            var firstParen = tokens[i].name.indexOf("(");
            var name = tokens[i].name.slice(0, firstParen);
            var argstr = tokens[i].name.slice(firstParen + 1, -1);
            var args = [];
            var buffer = "";
            var parenLevel = 0;
            for (var a = 0; a < argstr.length; a++) {
                buffer += argstr[a];
                if (argstr[a] == "(") {
                    parenLevel += 1;
                } else if (argstr[a] == ")") {
                    parenLevel -= 1;
                } else if (argstr[a] == "," && parenLevel == 0) {
                    buffer = buffer.slice(0, -1);
                    args.push(buffer);
                    buffer = "";
                    continue;
                }
            }
            args.push(buffer);
            for (var b = 0; b < args.length; b++) {
                var argtokens = tokenize(args[b]);
                var arganswer = evaluateFromTokens(argtokens);
                args[b] = arganswer;
                continue;
            }
            answer = callFunction(name, args);
            tokens[i].type = "number";
            tokens[i].name = answer;
            continue;
        } else if (tokens[i].type == "variable") {
            tokens[i].type = "number";
            tokens[i].name = variables[tokens[i].name];
            continue;
        }
    }
    var precedence = 3;
    while (precedence > 0) {
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i].type == "operator") {
                var op = matchOperator(tokens[i].name);
                if (op == null) {
                    throw "Invalid operator: " + tokens[i].name;
                }
                if (precedence == op.precedence) {
                    var args = [];
                    if (i - 1 < 0 || i + 1 >= tokens.length) {
                        throw "Malformed expression.";
                    }
                    args.push(tokens[(i - 1)].name);
                    args.push(tokens[(i + 1)].name);
                    var answer = callFunction(tokens[i].name, args, true);
                    tokens[i].type = "number";
                    tokens[i].name = answer;
                    tokens.splice(i - 1, 1);
                    i--;
                    tokens.splice(i + 1, 1);
                }
            }
        }
        precedence--;
    }
    if (tokens.length != 1 || tokens[0].type == "operator") {
        throw "Malformed expression."
    }
    if (tokens[0].type == "variable") {
        //This probably shouldn't happen, but just in case I guess.
        tokens[0].type = "number";
        tokens[0].name = variables[tokens[0].name];
    }
    if (tokens[0].type == "function") {
        tokens[0].type = "number";
        var functokens = tokenize(tokens[0].name);
        tokens[0].name = evaluateFromTokens(functokens);
    }
    if (tokens[0].type == "number") {
        return tokens[0].name;
    }
    return "";
}
var operators = [{
    "name": "+",
    "precedence": 1,
    "operate": function(args) {
        return args[0] + args[1];
    }
}, {
    "name": "-",
    "precedence": 1,
    "operate": function(args) {
        return args[0] - args[1];
    }
}, {
    "name": "*",
    "precedence": 2,
    "operate": function(args) {
        return args[0] * args[1];
    }
}, {
    "name": "/",
    "precedence": 2,
    "operate": function(args) {
        return args[0] / args[1];
    }
}, {
    "name": "^",
    "precedence": 3,
    "operate": function(args) {
        return args[0] ** args[1];
    }
}];
var functions = {
    "sqrt": function(args) {
        return args[0] ** 0.5;
    }
};
var variables = {};