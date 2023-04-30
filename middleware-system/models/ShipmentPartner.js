const mongoose = require("mongoose");

const serviceDetailSchema = new mongoose.Schema({
  URI: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["REST", "SOAP"],
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
});

const shipmentPartnerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: {
    type: String,
    required: true,
  },
  service: {
    type: serviceDetailSchema,
    required: true,
  },
});

module.exports = {
  ShipmentPartner: mongoose.model("ShipmentPartner", shipmentPartnerSchema),
};
