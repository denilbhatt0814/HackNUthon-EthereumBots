const soap = require("soap");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const Order = require("./Models/schema"); // Assuming your order model is saved in order-model.js

mongoose.connect(
  "mongodb+srv://Aniket:APS2409@logisticsystem.87nwglo.mongodb.net/?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  }
);

const wsdl = fs.readFileSync("order-service.wsdl", "utf8");

const service = {
  OrderService: {
    OrderPort: {
      FulfillOrder: async function (args) {
        try {
          const orderID = Math.round(Math.random() * 100000);

          console.log(args.items);

          const orderDetails = new Order({
            orderID: orderID,
            customerName: args.customerName,
            customerAddress: args.customerAddress,
            paymentMode: args.paymentMode,
            items: args.items.item,
            totalPrice: args.totalPrice,
          });
          const savedOrder = await orderDetails.save();
          return {
            trackingID: savedOrder._id,
            // trackingID: "123456",
          };
        } catch (err) {
          console.log(err);
          console.log("errors occurred...");
          throw new Error("Internal Server Error");
        }
      },
    },
  },
};

const app = express();
app.use(bodyParser.raw({ type: () => true, limit: "5mb" }));

soap.listen(app, "/wsdl", service, wsdl);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
