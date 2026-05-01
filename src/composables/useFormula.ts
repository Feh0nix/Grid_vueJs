import { ref } from 'vue'
import type { CellMap, FormulaDefinition, FormulaMap } from '../types/spreadsheet'
import { cellRefToCoords, parseRange, iterateRange, cellKey } from '../utils/helpers'

// ============================================================================
// DÉFINITIONS DES FORMULES
// ============================================================================

const baseFormulas: FormulaDefinition[] = [
  {
    key: 'SUM',
    title: 'Sum',
    render: ary => ary.reduce((a, b) => numberCalc('+', a, b), 0)
  },
  {
    key: 'AVERAGE',
    title: 'Average',
    render: ary => ary.reduce((a, b) => Number(a) + Number(b), 0) / ary.length
  },
  {
    key: 'COUNT',
    title: 'Count',
    render: ary => ary.filter(v => v !== '' && v !== null && v !== undefined).length
  },
  {
    key: 'MAX',
    title: 'Max',
    render: ary => Math.max(...ary.map(v => Number(v) || 0))
  },
  {
    key: 'MIN',
    title: 'Min',
    render: ary => Math.min(...ary.map(v => Number(v) || 0))
  },
  {
    key: 'IF',
    title: 'If',
    render: ([condition, trueVal, falseVal]) => condition ? trueVal : falseVal
  },
  {
    key: 'AND',
    title: 'And',
    render: ary => ary.every(it => Boolean(it))
  },
  {
    key: 'OR',
    title: 'Or',
    render: ary => ary.some(it => Boolean(it))
  },
  {
    key: 'NOT',
    title: 'Not',
    render: ([val]) => !Boolean(val)
  },
  {
    key: 'CONCAT',
    title: 'Concatenate',
    render: ary => ary.join('')
  },
  {
    key: 'CONCATENATE',
    title: 'Concatenate',
    render: ary => ary.join('')
  },
  {
    key: 'LEN',
    title: 'Length',
    render: ([str]) => String(str).length
  },
  {
    key: 'UPPER',
    title: 'Uppercase',
    render: ([str]) => String(str).toUpperCase()
  },
  {
    key: 'LOWER',
    title: 'Lowercase',
    render: ([str]) => String(str).toLowerCase()
  },
  {
    key: 'PROPER',
    title: 'Proper Case',
    render: ([str]) => String(str).replace(/\b\w/g, char => char.toUpperCase())
  },
  {
    key: 'LEFT',
    title: 'Left',
    render: ([str, num = 1]) => String(str).substring(0, Number(num))
  },
  {
    key: 'RIGHT',
    title: 'Right',
    render: ([str, num = 1]) => {
      const s = String(str)
      return s.substring(s.length - Number(num))
    }
  },
  {
    key: 'MID',
    title: 'Mid',
    render: ([str, start, num]) => String(str).substring(Number(start) - 1, Number(start) - 1 + Number(num))
  },
  {
    key: 'TRIM',
    title: 'Trim',
    render: ([str]) => String(str).trim()
  },
  {
    key: 'SQRT',
    title: 'Square Root',
    render: ([val]) => Math.sqrt(Number(val) || 0)
  },
  {
    key: 'POWER',
    title: 'Power',
    render: ([base, exp]) => Math.pow(Number(base) || 0, Number(exp) || 0)
  },
  {
    key: 'ABS',
    title: 'Absolute',
    render: ([val]) => Math.abs(Number(val) || 0)
  },
  {
    key: 'ROUND',
    title: 'Round',
    render: ([val, decimals = 0]) => {
      const multiplier = Math.pow(10, Number(decimals))
      return Math.round((Number(val) || 0) * multiplier) / multiplier
    }
  },
  {
    key: 'CEILING',
    title: 'Ceiling',
    render: ([val]) => Math.ceil(Number(val) || 0)
  },
  {
    key: 'FLOOR',
    title: 'Floor',
    render: ([val]) => Math.floor(Number(val) || 0)
  },
  {
    key: 'TODAY',
    title: 'Today',
    render: () => new Date().toISOString().split('T')[0]
  },
  {
    key: 'NOW',
    title: 'Now',
    render: () => new Date().toISOString()
  },
  {
    key: 'YEAR',
    title: 'Year',
    render: ([date]) => new Date(String(date)).getFullYear()
  },
  {
    key: 'MONTH',
    title: 'Month',
    render: ([date]) => new Date(String(date)).getMonth() + 1
  },
  {
    key: 'DAY',
    title: 'Day',
    render: ([date]) => new Date(String(date)).getDate()
  },
  {
    key: 'HOUR',
    title: 'Hour',
    render: ([date]) => new Date(String(date)).getHours()
  },
  {
    key: 'MINUTE',
    title: 'Minute',
    render: ([date]) => new Date(String(date)).getMinutes()
  },
  {
    key: 'SECOND',
    title: 'Second',
    render: ([date]) => new Date(String(date)).getSeconds()
  }
]

const formulaMap: FormulaMap = {}
baseFormulas.forEach(f => {
  formulaMap[f.key] = f
})

// ============================================================================
// CALCULS NUMÉRIQUES
// ============================================================================

export function numberCalc(op: string, a: number, b: number): number {
  const numA = Number(a) || 0
  const numB = Number(b) || 0
  
  switch (op) {
    case '+': return numA + numB
    case '-': return numA - numB
    case '*': return numA * numB
    case '/': return numB !== 0 ? numA / numB : Infinity
    default: return numA
  }
}

// ============================================================================
// PARSER D'EXPRESSIONS
// ============================================================================

interface ExprToken {
  type: 'number' | 'string' | 'cell' | 'range' | 'operator' | 'function' | 'paren'
  value: string
}

function tokenize(expr: string): ExprToken[] {
  const tokens: ExprToken[] = []
  let i = 0
  
  while (i < expr.length) {
    const char = expr[i]
    
    // Skip whitespace
    if (char === ' ') {
      i++
      continue
    }
    
    // Numbers
    if (char >= '0' && char <= '9' || char === '.') {
      let num = ''
      while (i < expr.length && (expr[i] >= '0' && expr[i] <= '9' || expr[i] === '.')) {
        num += expr[i++]
      }
      tokens.push({ type: 'number', value: num })
      continue
    }
    
    // Strings (quoted)
    if (char === '"') {
      let str = ''
      i++
      while (i < expr.length && expr[i] !== '"') {
        str += expr[i++]
      }
      i++ // skip closing quote
      tokens.push({ type: 'string', value: str })
      continue
    }
    
    // Cell references or ranges
    if (char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z') {
      let ref = ''
      while (i < expr.length && (expr[i] >= 'A' && expr[i] <= 'Z' || expr[i] >= 'a' && expr[i] <= 'z' || expr[i] >= '0' && expr[i] <= '9')) {
        ref += expr[i++]
      }
      
      // Check if it's a range (has : somewhere ahead)
      if (i < expr.length && expr[i] === ':') {
        let range = ref
        range += expr[i++] // add :
        // Get the second part of range
        let ref2 = ''
        while (i < expr.length && (expr[i] >= 'A' && expr[i] <= 'Z' || expr[i] >= 'a' && expr[i] <= 'z' || expr[i] >= '0' && expr[i] <= '9')) {
          ref2 += expr[i++]
        }
        range += ref2
        tokens.push({ type: 'range', value: range })
      } else {
        tokens.push({ type: 'cell', value: ref })
      }
      continue
    }
    
    // Operators and comparison
    if ('+-*/=<>!'.includes(char)) {
      let op = char
      i++
      // Check for two-char operators
      if (i < expr.length && expr[i] === '=' && (char === '<' || char === '>' || char === '!')) {
        op += expr[i++]
      }
      tokens.push({ type: 'operator', value: op })
      continue
    }
    
    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char })
      i++
      continue
    }
    
    // Comma
    if (char === ',') {
      tokens.push({ type: 'operator', value: char })
      i++
      continue
    }
    
    i++
  }
  
  return tokens
}

// Convert infix to postfix (RPN)
function infixToPostfix(tokens: ExprToken[]): ExprToken[] {
  const output: ExprToken[] = []
  const stack: ExprToken[] = []
  
  const precedence: Record<string, number> = {
    '=': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '<>': 1,
    '+': 2, '-': 2,
    '*': 3, '/': 3,
    ',': 0
  }
  
  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'string' || token.type === 'cell' || token.type === 'range') {
      output.push(token)
    } else if (token.type === 'function') {
      stack.push(token)
    } else if (token.type === 'operator') {
      while (stack.length > 0 && 
             stack[stack.length - 1].type === 'operator' &&
             precedence[stack[stack.length - 1].value] >= precedence[token.value]) {
        output.push(stack.pop()!)
      }
      stack.push(token)
    } else if (token.value === '(') {
      stack.push(token)
    } else if (token.value === ')') {
      while (stack.length > 0 && stack[stack.length - 1].value !== '(') {
        output.push(stack.pop()!)
      }
      stack.pop() // remove '('
      
      // If there's a function on top of stack, pop it
      if (stack.length > 0 && stack[stack.length - 1].type === 'function') {
        output.push(stack.pop()!)
      }
    }
  }
  
  while (stack.length > 0) {
    output.push(stack.pop()!)
  }
  
  return output
}

// ============================================================================
// ÉVALUATION
// ============================================================================

export function evaluateFormula(
  formula: string,
  cells: CellMap,
  evaluating: Set<string> = new Set()
): string {
  if (!formula.startsWith('=')) return formula
  
  const expr = formula.substring(1)
  
  try {
    // Tokenize and convert to postfix
    const tokens = tokenize(expr)
    
    // Identify functions in tokens
    const processedTokens: ExprToken[] = []
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      // Check if this is a function name followed by (
      if (token.type === 'cell' && i + 1 < tokens.length && tokens[i + 1].value === '(') {
        const funcName = token.value.toUpperCase()
        if (formulaMap[funcName]) {
          processedTokens.push({ type: 'function', value: funcName })
          processedTokens.push(tokens[++i]) // push '('
        } else {
          processedTokens.push(token)
        }
      } else {
        processedTokens.push(token)
      }
    }
    
    const postfix = infixToPostfix(processedTokens)
    
    // Evaluate postfix
    const stack: any[] = []
    
    for (const token of postfix) {
      switch (token.type) {
        case 'number':
          stack.push(Number(token.value))
          break
          
        case 'string':
          stack.push(token.value)
          break
          
        case 'cell': {
          const coords = cellRefToCoords(token.value)
          if (!coords) {
            stack.push(0)
            break
          }
          
          const key = cellKey(coords.row, coords.col)
          
          // Check for circular reference
          if (evaluating.has(key)) {
            stack.push('#REF!')
            break
          }
          
          const cell = cells.get(key)
          if (!cell) {
            stack.push(0)
            break
          }
          
          if (cell.formula) {
            evaluating.add(key)
            const result = evaluateFormula(cell.formula, cells, evaluating)
            evaluating.delete(key)
            const numResult = parseFloat(result)
            stack.push(isNaN(numResult) ? result : numResult)
          } else {
            const numValue = parseFloat(cell.value)
            stack.push(isNaN(numValue) ? cell.value : numValue)
          }
          break
        }
          
        case 'range': {
          const range = parseRange(token.value)
          if (!range) {
            stack.push([])
            break
          }
          
          const values: any[] = []
          for (const pos of iterateRange(range)) {
            const key = cellKey(pos.row, pos.col)
            
            // Check for circular reference
            if (evaluating.has(key)) {
              values.push('#REF!')
              continue
            }
            
            const cell = cells.get(key)
            if (!cell) {
              values.push(0)
              continue
            }
            
            if (cell.formula) {
              evaluating.add(key)
              const result = evaluateFormula(cell.formula, cells, evaluating)
              evaluating.delete(key)
              const numResult = parseFloat(result)
              values.push(isNaN(numResult) ? result : numResult)
            } else {
              const numValue = parseFloat(cell.value)
              values.push(isNaN(numValue) ? cell.value : numValue)
            }
          }
          stack.push(values)
          break
        }
          
        case 'function': {
          const funcDef = formulaMap[token.value]
          if (!funcDef) {
            stack.push('#NAME?')
            break
          }
          
          // Collect arguments
          const args: any[] = []
          while (stack.length > 0) {
            const arg = stack.pop()
            if (Array.isArray(arg)) {
              args.unshift(...arg)
            } else {
              args.unshift(arg)
            }
            // Check if previous token was comma separator
            if (stack.length > 0 && stack[stack.length - 1] === ',') {
              stack.pop()
            } else {
              break
            }
          }
          
          const result = funcDef.render(args)
          stack.push(result)
          break
        }
          
        case 'operator': {
          if (token.value === ',') {
            stack.push(',')
            break
          }
          
          const b = stack.pop()
          const a = stack.pop()
          
          let result: any
          switch (token.value) {
            case '+': result = numberCalc('+', a, b); break
            case '-': result = numberCalc('-', a, b); break
            case '*': result = numberCalc('*', a, b); break
            case '/': result = numberCalc('/', a, b); break
            case '=': result = a == b; break
            case '<>': result = a != b; break
            case '<': result = a < b; break
            case '>': result = a > b; break
            case '<=': result = a <= b; break
            case '>=': result = a >= b; break
            default: result = 0
          }
          stack.push(result)
          break
        }
      }
    }
    
    const finalResult = stack[0]
    if (typeof finalResult === 'boolean') {
      return finalResult ? 'TRUE' : 'FALSE'
    }
    return String(finalResult ?? '')
    
  } catch (error) {
    console.error('Formula evaluation error:', error)
    return '#ERROR!'
  }
}

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useFormula() {
  const formulas = ref<FormulaMap>(formulaMap)
  
  const evaluate = (formula: string, cells: CellMap): string => {
    return evaluateFormula(formula, cells)
  }
  
  const isFormula = (value: string): boolean => {
    return value.startsWith('=')
  }
  
  const getCellValue = (cells: CellMap, row: number, col: number): number | string => {
    const key = cellKey(row, col)
    const cell = cells.get(key)
    if (!cell) return 0
    
    if (cell.formula) {
      const result = evaluateFormula(cell.formula, cells)
      const numResult = parseFloat(result)
      return isNaN(numResult) ? result : numResult
    }
    
    const numValue = parseFloat(cell.value)
    return isNaN(numValue) ? cell.value : numValue
  }
  
  return {
    formulas,
    evaluate,
    isFormula,
    getCellValue,
    formulaMap,
    baseFormulas
  }
}
