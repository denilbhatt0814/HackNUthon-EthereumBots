const express = require("express");
const app = express();
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
const logisticSchema = require("./Models/schema");
const db =
  "mongodb+srv://Aniket:ap2409@logisticsystem.87nwglo.mongodb.net/LogisticSystem?retryWrites=true&w=majority";

app.use(express.json());

mongoose
  .connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successs...");
  })
  .catch((err) => {
    console.log(err);
  });

app.post("/fulfillorder", async (req, res) => {
  const OrderID = Math.round(Math.random() * 100000);
  try {
    const logfdetails = new logisticSchema({
      orderID: req.body.orderID,
      customerName: req.body.customerName,
      customerAddress: req.body.customerAddress,
      paymentMode: req.body.paymentMode,
      items: req.body.items,
      totalPrice: req.body.totalPrice,
    });

    const reldata = await logfdetails.save();

    return res.status(201).json({ reldata, trackingID: reldata._id });
  } catch (err) {
    return res.status(500).json({ msg: "internal server error", err });
  }
});

app.get("/order/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await logisticSchema.findById(id);
    var success = "Transaction Successful";
    const resdata = {
      TrackID: id,
      Status: success,
      Message: "Your Txn is successful. Visit Again !! ",
    };
    res.status(200).send(resdata);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log(`listening to port ${port}`);
});
