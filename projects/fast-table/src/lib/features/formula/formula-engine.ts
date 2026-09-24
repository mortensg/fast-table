export type CellValueResolver = (colLetter: string, rowNumber: number) => unknown;

export type FormulaFn = (args: unknown[][]) => unknown;

const isNum = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);

function flatten(args: unknown[][]): unknown[] {
  return args.flat();
}

export const BUILT_IN_FUNCTIONS: Record<string, FormulaFn> = {
  SUM: (args) =>
    flatten(args)
      .filter(isNum)
      .reduce((a: number, b) => a + (b as number), 0),
  AVERAGE: (args) => {
    const nums = flatten(args).filter(isNum) as number[];
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
  },
  MIN: (args) => {
    const nums = flatten(args).filter(isNum) as number[];
    return nums.length ? Math.min(...nums) : 0;
  },
  MAX: (args) => {
    const nums = flatten(args).filter(isNum) as number[];
    return nums.length ? Math.max(...nums) : 0;
  },
  COUNT: (args) => flatten(args).filter(isNum).length,
  COUNTA: (args) => flatten(args).filter((v) => v !== null && v !== undefined && v !== '').length,
  ROUND: (args) => {
    const [v, d] = flatten(args) as number[];
    const factor = Math.pow(10, d ?? 0);
    return Math.round((v ?? 0) * factor) / factor;
  },
  ABS: (args) => Math.abs(Number(flatten(args)[0]) || 0),
  IF: (args) => {
    const [cond, whenTrue, whenFalse] = args.map((a) => a[0]);
    return cond ? whenTrue : whenFalse;
  },
  AND: (args) => flatten(args).every(Boolean),
  OR: (args) => flatten(args).some(Boolean),
  NOT: (args) => !flatten(args)[0],
  CONCATENATE: (args) =>
    flatten(args)
      .map((v) => (v == null ? '' : String(v)))
      .join(''),
  TODAY: () => new Date(),
};

type TokenType =
  'number' | 'string' | 'ref' | 'range' | 'op' | 'lparen' | 'rparen' | 'comma' | 'ident';
interface Token {
  type: TokenType;
  value: string;
}

const CELL_REF_RE = /^[A-Z]+[0-9]+$/;

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ type: 'lparen', value: c });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ type: 'rparen', value: c });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ type: 'comma', value: c });
      i++;
      continue;
    }
    if ('+-*/^<>='.includes(c)) {
      let op = c;
      if ((c === '<' || c === '>') && expr[i + 1] === '=') op += '=';
      tokens.push({ type: 'op', value: op });
      i += op.length;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let str = '';
      while (j < expr.length && expr[j] !== '"') {
        str += expr[j];
        j++;
      }
      tokens.push({ type: 'string', value: str });
      i = j + 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      let num = '';
      while (j < expr.length && /[0-9.]/.test(expr[j])) {
        num += expr[j];
        j++;
      }
      tokens.push({ type: 'number', value: num });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      let word = '';
      while (j < expr.length && /[A-Za-z0-9_]/.test(expr[j])) {
        word += expr[j];
        j++;
      }
      // range like A1:B5
      if (expr[j] === ':' && CELL_REF_RE.test(word.toUpperCase())) {
        let k = j + 1;
        let word2 = '';
        while (k < expr.length && /[A-Za-z0-9]/.test(expr[k])) {
          word2 += expr[k];
          k++;
        }
        tokens.push({ type: 'range', value: `${word.toUpperCase()}:${word2.toUpperCase()}` });
        i = k;
        continue;
      }
      if (CELL_REF_RE.test(word.toUpperCase())) {
        tokens.push({ type: 'ref', value: word.toUpperCase() });
      } else {
        tokens.push({ type: 'ident', value: word.toUpperCase() });
      }
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

interface AstNode {
  eval(resolve: CellValueResolver, customFns: Record<string, FormulaFn>): unknown;
}

class NumberNode implements AstNode {
  constructor(private value: number) {}
  eval(): unknown {
    return this.value;
  }
}
class StringNode implements AstNode {
  constructor(private value: string) {}
  eval(): unknown {
    return this.value;
  }
}
class RefNode implements AstNode {
  constructor(
    private col: string,
    private row: number,
  ) {}
  eval(resolve: CellValueResolver): unknown {
    return resolve(this.col, this.row);
  }
}
class RangeNode implements AstNode {
  constructor(
    private from: [string, number],
    private to: [string, number],
  ) {}
  eval(resolve: CellValueResolver): unknown {
    const [c1, r1] = this.from;
    const [c2, r2] = this.to;
    const colFrom = Math.min(colToIndex(c1), colToIndex(c2));
    const colTo = Math.max(colToIndex(c1), colToIndex(c2));
    const rowFrom = Math.min(r1, r2);
    const rowTo = Math.max(r1, r2);
    const values: unknown[] = [];
    for (let r = rowFrom; r <= rowTo; r++) {
      for (let c = colFrom; c <= colTo; c++) {
        values.push(resolve(indexToCol(c), r));
      }
    }
    return values;
  }
}
class BinaryOpNode implements AstNode {
  constructor(
    private op: string,
    private left: AstNode,
    private right: AstNode,
  ) {}
  eval(resolve: CellValueResolver, fns: Record<string, FormulaFn>): unknown {
    const l = this.left.eval(resolve, fns);
    const r = this.right.eval(resolve, fns);
    const ln = Number(l) || 0;
    const rn = Number(r) || 0;
    switch (this.op) {
      case '+':
        return ln + rn;
      case '-':
        return ln - rn;
      case '*':
        return ln * rn;
      case '/':
        return rn === 0 ? 0 : ln / rn;
      case '^':
        return Math.pow(ln, rn);
      case '=':
        return l === r;
      case '<':
        return ln < rn;
      case '>':
        return ln > rn;
      case '<=':
        return ln <= rn;
      case '>=':
        return ln >= rn;
      default:
        return 0;
    }
  }
}
class FuncNode implements AstNode {
  constructor(
    private name: string,
    private args: AstNode[],
  ) {}
  eval(resolve: CellValueResolver, fns: Record<string, FormulaFn>): unknown {
    const fn = fns[this.name] ?? BUILT_IN_FUNCTIONS[this.name];
    if (!fn) throw new Error(`#NAME? Ukendt funktion: ${this.name}`);
    const argValues = this.args.map((a) => {
      const v = a.eval(resolve, fns);
      return Array.isArray(v) ? v : [v];
    });
    return fn(argValues);
  }
}

function colToIndex(col: string): number {
  let idx = 0;
  for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}
function indexToCol(idx: number): string {
  let n = idx + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }
  private next(): Token {
    return this.tokens[this.pos++];
  }

  parse(): AstNode {
    return this.parseExpr();
  }

  private parseExpr(): AstNode {
    let left = this.parseTerm();
    while (
      this.peek()?.type === 'op' &&
      ['+', '-', '=', '<', '>', '<=', '>='].includes(this.peek()!.value)
    ) {
      const op = this.next().value;
      const right = this.parseTerm();
      left = new BinaryOpNode(op, left, right);
    }
    return left;
  }

  private parseTerm(): AstNode {
    let left = this.parseFactor();
    while (this.peek()?.type === 'op' && ['*', '/'].includes(this.peek()!.value)) {
      const op = this.next().value;
      const right = this.parseFactor();
      left = new BinaryOpNode(op, left, right);
    }
    return left;
  }

  private parseFactor(): AstNode {
    let base = this.parseAtom();
    while (this.peek()?.type === 'op' && this.peek()!.value === '^') {
      this.next();
      const right = this.parseAtom();
      base = new BinaryOpNode('^', base, right);
    }
    return base;
  }

  private parseAtom(): AstNode {
    const tok = this.peek();
    if (!tok) throw new Error('#ERROR? Uventet slutning');

    if (tok.type === 'op' && tok.value === '-') {
      this.next();
      return new BinaryOpNode('-', new NumberNode(0), this.parseAtom());
    }
    if (tok.type === 'number') {
      this.next();
      return new NumberNode(parseFloat(tok.value));
    }
    if (tok.type === 'string') {
      this.next();
      return new StringNode(tok.value);
    }
    if (tok.type === 'range') {
      this.next();
      const [a, b] = tok.value.split(':');
      return new RangeNode(this.splitRef(a), this.splitRef(b));
    }
    if (tok.type === 'ref') {
      this.next();
      const [col, row] = this.splitRef(tok.value);
      return new RefNode(col, row);
    }
    if (tok.type === 'lparen') {
      this.next();
      const inner = this.parseExpr();
      if (this.peek()?.type === 'rparen') this.next();
      return inner;
    }
    if (tok.type === 'ident') {
      const name = this.next().value;
      if (this.peek()?.type === 'lparen') {
        this.next();
        const args: AstNode[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseExpr());
          while (this.peek()?.type === 'comma') {
            this.next();
            args.push(this.parseExpr());
          }
        }
        if (this.peek()?.type === 'rparen') this.next();
        return new FuncNode(name, args);
      }
      return new StringNode(name);
    }
    throw new Error(`#ERROR? Uventet symbol: ${tok.value}`);
  }

  private splitRef(ref: string): [string, number] {
    const match = ref.match(/^([A-Z]+)([0-9]+)$/);
    if (!match) throw new Error(`#REF! Ugyldig reference: ${ref}`);
    return [match[1], parseInt(match[2], 10)];
  }
}

/** Parses and evaluates a spreadsheet-style formula string (leading "=" optional). */
export class FormulaEngine {
  private customFunctions: Record<string, FormulaFn> = {};

  registerFunction(name: string, fn: FormulaFn): void {
    this.customFunctions[name.toUpperCase()] = fn;
  }

  evaluate(expression: string, resolve: CellValueResolver): unknown {
    const expr = expression.startsWith('=') ? expression.slice(1) : expression;
    try {
      // identifiers/refs are uppercased individually inside tokenize() — the
      // whole expression must NOT be uppercased here, or string literals
      // like "Høj" would be mangled into "HØJ"
      const tokens = tokenize(expr);
      const ast = new Parser(tokens).parse();
      return ast.eval(resolve, this.customFunctions);
    } catch (e) {
      return e instanceof Error ? e.message : '#ERROR?';
    }
  }

  static colToIndex = colToIndex;
  static indexToCol = indexToCol;
}
