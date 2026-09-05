/**
 * Sim extension: Standing Orders. A strategy with `orders` writes its rules the moment the orders
 * unlock (and again when new slots or kinds arrive), then lets them run: the `authored` strategy
 * is the idle player who wrote five good orders, and the difference between it and `idle` is what
 * authorship is worth.
 */
import { registerSimExtension, type PolicyParams } from './strategies';
import { orderSlots, orderProblem, type Order } from '@/engine';

export type OrderSpec = Omit<Order, 'id' | 'fired' | 'cd' | 'on'> & { on?: boolean };

registerSimExtension((view, params, mem, out) => {
  const specs = (params as PolicyParams & { orders?: OrderSpec[] }).orders;
  if (!specs || !view.state.flags.ordersUnlocked) return;
  const s = view.state;
  const slots = orderSlots(s);
  // the rules that can be given now, in priority order, as many as fit
  const rules: Order[] = [];
  for (const spec of specs) {
    if (rules.length >= slots) break;
    const r: Order = { id: rules.length + 1, when: spec.when, then: spec.then, on: spec.on !== false, fired: 0, cd: 0 };
    if (orderProblem(s, r) === null) rules.push(r);
  }
  const key = rules.map((r) => JSON.stringify([r.when, r.then])).join('|');
  if (key === (mem.ordersKey as string)) return;
  if (view.t - ((mem.ordersAt as number) ?? -1e9) < 30) return;
  mem.ordersKey = key; mem.ordersAt = view.t;
  // keep the ids and counters of rules that already exist
  const existing = s.orders.rules;
  for (const r of rules) { const same = existing.find((x) => JSON.stringify([x.when, x.then]) === JSON.stringify([r.when, r.then])); if (same) { r.id = same.id; r.fired = same.fired; } }
  out.push({ type: 'setOrders', rules });
});
