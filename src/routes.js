const express = require('express');
const { Client, Service, Counter, Invoice } = require('./models');
const router = express.Router();

// Wrap async handlers so errors reach the error middleware
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const notFound = (res) => res.status(404).json({ error: 'Not found' });

// Generic CRUD for clients and services
function crud(path, Model, guard) {
  router.get(path, h(async (_q, res) => res.json(await Model.find().sort({ name: 1 }))));
  router.post(path, h(async (q, res) => res.status(201).json(await Model.create(q.body))));
  router.put(`${path}/:id`, h(async (q, res) => {
    const doc = await Model.findByIdAndUpdate(q.params.id, q.body, { new: true, runValidators: true });
    doc ? res.json(doc) : notFound(res);
  }));
  router.delete(`${path}/:id`, h(async (q, res) => {
    if (guard) await guard(q.params.id);
    const doc = await Model.findByIdAndDelete(q.params.id);
    doc ? res.json({ ok: true }) : notFound(res);
  }));
}
crud('/clients', Client, async (id) => {
  if (await Invoice.exists({ client: id })) {
    const e = new Error('This client has invoices. Delete those first.'); e.status = 409; throw e;
  }
});
crud('/services', Service);

// Invoices
const populate = (q) => q.populate('client');

router.get('/invoices', h(async (q, res) => {
  const filter = {};
  if (q.query.client) filter.client = q.query.client;
  let list = await populate(Invoice.find(filter).sort({ createdAt: -1 }));
  if (q.query.status) list = list.filter((i) => i.status === q.query.status); // status is computed
  res.json(list);
}));

router.get('/invoices/:id', h(async (q, res) => {
  const inv = await populate(Invoice.findById(q.params.id));
  inv ? res.json(inv) : notFound(res);
}));

router.post('/invoices', h(async (q, res) => {
  const c = await Counter.findByIdAndUpdate('invoice', { $inc: { seq: 1 } }, { new: true, upsert: true });
  const number = `INV-${String(c.seq).padStart(4, '0')}`;
  const inv = await Invoice.create({ ...q.body, number, payments: [] });
  res.status(201).json(await populate(Invoice.findById(inv._id)));
}));

router.put('/invoices/:id', h(async (q, res) => {
  const { number, payments, ...rest } = q.body; // number & payments are not editable here
  const inv = await Invoice.findById(q.params.id);
  if (!inv) return notFound(res);
  inv.set(rest);
  await inv.save();
  res.json(await populate(Invoice.findById(inv._id)));
}));

router.delete('/invoices/:id', h(async (q, res) => {
  const inv = await Invoice.findByIdAndDelete(q.params.id);
  inv ? res.json({ ok: true }) : notFound(res);
}));

// Payments
router.post('/invoices/:id/payments', h(async (q, res) => {
  const inv = await Invoice.findById(q.params.id);
  if (!inv) return notFound(res);
  const amount = Number(q.body.amount);
  if (!(amount > 0)) return res.status(400).json({ error: 'Enter a payment amount above 0.' });
  if (amount > inv.balance + 0.001) {
    return res.status(400).json({ error: `Payment is more than the balance of ${inv.balance}.` });
  }
  inv.payments.push({ ...q.body, amount });
  await inv.save();
  res.status(201).json(await populate(Invoice.findById(inv._id)));
}));

router.delete('/invoices/:id/payments/:pid', h(async (q, res) => {
  const inv = await Invoice.findById(q.params.id);
  if (!inv) return notFound(res);
  inv.payments.pull({ _id: q.params.pid });
  await inv.save();
  res.json(await populate(Invoice.findById(inv._id)));
}));

// Dashboard totals
router.get('/dashboard', h(async (_q, res) => {
  const all = await Invoice.find();
  const sum = (k) => Math.round(all.reduce((s, i) => s + i[k], 0) * 100) / 100;
  res.json({
    invoiced: sum('total'),
    collected: sum('paid'),
    outstanding: sum('balance'),
    overdue: all.filter((i) => i.status === 'overdue').length,
    invoiceCount: all.length,
  });
}));

module.exports = router;