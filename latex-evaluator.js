function isNumber (char) {
  const num = +char;
  return num.toString() !== 'NaN';
}

function isAlpha (char) {
  return char.charCodeAt(0) >= 'a'.charCodeAt(0) && char.charCodeAt(0) <= 'z'.charCodeAt(0);
}

function isOperator (char) {
  return char === '+' || char === '-' || char === '>' || char === '<';
}

function parseNumber (chars) {
  let number = '';

  while((isNumber(chars[0]) || (chars[0] === '.' && !number.includes('.'))) && chars.length) {
    number += chars.shift();
  }

  return +number;
}

function peekString (chars, string) {
  string = string.split('');
  for(let i=0; i<string.length; i++) {
    if (chars[i] !== string[i]) {
      return false;
    }
  }

  return true;
}

function parseContents (chars) {
  let exp = '';
  chars.shift();
  const inner = [];
  let count = 1;
  while(count > 0) {
    inner.push(chars.shift());
    if (chars[0] === '{') count ++;
    if (chars[0] === '}') count --;
  }
  if (chars[0] === '}') {
    chars.shift();
    exp += parseExpression(inner);
  } else {
    throw new Error('Parse Error: Unterminated contents list');
  }

  return exp;
}

function parseFunction (chars) {
  const contents = [];
  let name = '';
  let options = '';
  let exp = '';

  chars.shift();
  chars.shift();

  while(isAlpha(chars[0]))
    name += chars.shift();

  if (chars[0] === '[') {
    options = chars.shift();
    while(chars[0] !== ']' && chars.length)
      options += chars.shift();
    if (chars[0] === ']') {
      options += chars.shift();
      try {
        options = JSON.parse(options);
      } catch(err) {
        throw new Error('Parse Error: Error while parsing options list');
      }
    } else {
      throw new Error('Parse Error: Unterminated options list');
    }
  }

  while(chars[0] === '{') {
    if (chars[0] === '{') {
      contents.push(parseContents(chars));
    }
  }

  if (name === 'frac') {
    exp += `((${contents[0]}) / (${contents[1]}))`;
  } else if (name === 'div') {
    exp += '/';
  } else if (name === 'times') {
    exp += '*';
  } else if (name === 'sqrt') {
    let root = 1/2;
    if (options.length) {
      root = 1 / options[0];
    }
    exp += `Math.pow(${contents[0]}, ${root})`;
  } else if (name === 'le') {
    exp += '<=';
  } else if (name === 'ge') {
    exp += '>='
  }
  return exp;
}

function parseExpression (chars) {
  let exp = '';
  while (chars.length) {
    const char = chars[0];

    if(isNumber(char)) {
      exp += parseNumber(chars);
      if (peekString(chars, '\\\\frac')) {
        exp += '+';
      } else if (chars[0] && !isOperator(chars[0]) && chars[0] !== '^' && chars[0] !== ')' && chars[0] !== '=' && chars[0] !== '}') {
        exp += '*';
      }
    } else if (isOperator(char)) {
      exp += char;
      chars.shift();
    } else if (char === '(' || char === ')') {
      exp += char;
      chars.shift();
    } else if (char === '^') {
      chars.shift();
      exp += '**';
      if (chars[0] === '{') {
        exp += parseContents(chars);
      }
    } else if (char === '=') {
      exp += '===';
      chars.shift();
    } else if (char === '\\' && chars[1] === '\\') {
      exp += parseFunction(chars)
    } else if (isAlpha(char)) {
      exp += `arguments[0]['${char}']`;
      chars.shift();
      if (peekString(chars, '\\frac')) {
        exp += '+';
      } else if (chars[0] && !isOperator(chars[0]) && chars[0] !== '^' && chars[0] !== ')' && chars[0] !== '=' && chars[0] !== '}') {
        exp += '*';
      }
    } else {
      throw new Error(`Parse error: Unrecognized char {${chars[0]}}`);
    }
  }

  return exp;
}

function parse (latex) {
  latex = latex.replace(/\s/g, '').replace(/\\\\left/g, '').replace(/\\\\right/g, '');
  const chars = latex.split('');
  const expression = parseExpression(chars);
  /* eslint no-new-func: "off" */
  const fn = new Function (`return ${expression};`);
  return fn;
}

function evaluateAndCompare (latex1, latex2) {
  const variables = {};
  for(let i=0; i<26; i++) {
    variables[String.fromCharCode('a'.charCodeAt(0) + i)] = Math.floor(Math.random() * 10);
  }
  const latexEval1 = parse(latex1);
  const latex1Result = latexEval1(variables);
  const latexEval2 = parse(latex2);
  const latex2Result = latexEval2(variables);

  return latex1Result === latex2Result;
}

module.exports = evaluateAndCompare;
