import type { AggFuncFn } from '../../models/column-def';
import type { AggFuncName } from '../../models/enums';

const isNum = (v: unknown): v is number => typeof v === 'number' && !isNaN(v);

export const BUILT_IN_AGG_FUNCS: Record<AggFuncName, AggFuncFn> = {
  sum: ({ values }) => values.filter(isNum).reduce((a, b) => a + b, 0),
  avg: ({ values }) => {
    const nums = values.filter(isNum);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  },
  min: ({ values }) => {
    const nums = values.filter(isNum);
    return nums.length ? Math.min(...nums) : null;
  },
  max: ({ values }) => {
    const nums = values.filter(isNum);
    return nums.length ? Math.max(...nums) : null;
  },
  count: ({ values }) => values.length,
  first: ({ values }) => (values.length ? values[0] : null),
  last: ({ values }) => (values.length ? values[values.length - 1] : null),
};

export function resolveAggFunc(fn: AggFuncName | AggFuncFn | null | undefined): AggFuncFn | null {
  if (!fn) return null;
  if (typeof fn === 'function') return fn;
  return BUILT_IN_AGG_FUNCS[fn] ?? null;
}
