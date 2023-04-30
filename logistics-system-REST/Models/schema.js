const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderID: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['COD', 'Online'],
    // required: true
  },
  items: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    }
  }],
  totalPrice: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }

});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;