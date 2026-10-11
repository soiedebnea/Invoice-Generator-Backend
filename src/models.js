const mongoose = require('mongoose');
const { Schema } = mongoose;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const Client = mongoose.model('Client', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  phone: String,
  address: String,
}, { timestamps: true }));

const Service = mongoose.model('Service', new Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  rate: { type: Number, required: true, min: 0 },
}, { timestamps: true }));

const Counter = mongoose.model('Counter', new Schema({
  _id: String, seq: { type: Number, default: 0 },
}));

const invoiceSchema = new Schema({
  number: { type: String, unique: true },
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  items: [{
    description: { type: String, required: true },
    quantity: { type: Number, min: 0, default: 1 },
    rate: { type: Number, min: 0, default: 0 },
  }],
  taxRate: { type: Number, min: 0, default: 0 },   // percent
  discount: { type: Number, min: 0, default: 0 },  // flat amount
  issueDate: { type: Date, default: Date.now },
  dueDate: Date,
  notes: String,
  payments: [{
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, default: Date.now },
    method: { type: String, default: 'Cash' },
    note: String,
  }],
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

invoiceSchema.virtual('subtotal').get(function () {
  return r2(this.items.reduce((s, i) => s + i.quantity * i.rate, 0));
});
invoiceSchema.virtual('tax').get(function () {
  return r2(((this.subtotal - this.discount) * this.taxRate) / 100);
});
invoiceSchema.virtual('total').get(function () {
  return r2(this.subtotal - this.discount + this.tax);
});
invoiceSchema.virtual('paid').get(function () {
  return r2(this.payments.reduce((s, p) => s + p.amount, 0));
});
invoiceSchema.virtual('balance').get(function () {
  return r2(this.total - this.paid);
});
invoiceSchema.virtual('status').get(function () {
  if (this.total > 0 && this.balance <= 0) return 'paid';
  if (this.dueDate && this.dueDate < new Date() && this.balance > 0) return 'overdue';
  if (this.paid > 0) return 'partial';
  return 'unpaid';
});

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = { Client, Service, Counter, Invoice };