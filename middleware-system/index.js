require("dotenv").config();
const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const axios = require("axios");
const { ShipmentPartner } = require("./models/ShipmentPartner");
const { default: mongoose } = require("mongoose");
const Joi = require("joi");
const convertData = require("./mapping");
const redisClient = require("./database/redisClient");
const port = process.env.PORT || 5000;

const typeDefs = gql`
  type Query {
    hello: String
  }

  type Order {
    id: ID!
    customerName: String
    customerAddress: String
    customerContact: String
    items: [Item]
    billAmount: Float
    shipmentPartnerID: String
    paymentMethod: String
  }

  type Item {
    id: ID!
    name: String
    quantity: Int
    pricePerUnit: Float
  }

  input ItemInput {
    id: ID!
    name: String
    quantity: Int
    pricePerUnit: Float
  }

  input OrderInput {
    id: ID!
    customerName: String!
    customerAddress: String!
    customerContact: String!
    items: [ItemInput]!
    billAmount: Float!
    shipmentPartnerID: String!
    paymentMethod: String!
  }

  type DeliveryRegisterationResponse {
    success: Boolean
    msg: String
    trackingID: ID!
  }

  type Mutation {
    registerDelivery(input: OrderInput): DeliveryRegisterationResponse
  }
`;

const resolvers = {
  Mutation: {
    registerDelivery: async (_parent, { input }) => {
      const {
        id,
        customerName,
        customerAddress,
        customerContact,
        items,
        billAmount,
        shipmentPartnerID,
        paymentMethod,
      } = input;

      // Validate shipmentPartnerID using Joi
      const schema = Joi.object({
        id: Joi.string().required(),
        customerName: Joi.string().required(),
        customerAddress: Joi.string().required(),
        customerContact: Joi.string().required(),
        items: Joi.array().items(
          Joi.object({
            id: Joi.string().required(),
            name: Joi.string(),
            quantity: Joi.number().integer().positive(),
            pricePerUnit: Joi.number().positive(),
          })
        ),
        billAmount: Joi.number().positive().required(),
        shipmentPartnerID: Joi.string().required(),
        paymentMethod: Joi.string(),
      });
      const { error } = schema.validate(input);
      if (error) {
        throw new Error(error.message);
      }
      try {
        const partner = await ShipmentPartner.findOne({
          id: shipmentPartnerID,
        });
        if (!partner) {
          throw new Error(`Invalid shipment partner ID: ${shipmentPartnerID}`);
        }

        const { URI, type, metadata } = partner.service;
        if (type == "REST") {
          const requiredData = convertData(input, metadata.mapping);

          const axiosResponse = await axios.post(URI, {
            ...requiredData,
          });

          return {
            success: true,
            msg: `orderID[${id}] successfully registered for delivery`,
            trackingID: axiosResponse.data.trackingID,
          };
        }

        // CAN ADD MORE TYPES HERE
        throw new Error(`Invalid service type for shipment partner: ${type}`);
      } catch (error) {
        // Handle error in communicating with the logistics partner
        console.log("registerDelivery:", error);

        // Save the order in Redis message queue
        redisClient.rPush("orders", JSON.stringify(input), (err, res) => {
          if (err) {
            console.log("Error saving order to Redis:", err);
          } else {
            console.log(`OrderID[${id}] saved to Redis, list length: ${res}`);
          }
        });

        return {
          success: false,
          msg: `orderID[${id}] failed to register for delivery`,
          trackingID: null,
        };
      }
    },
  },
};

// Wrappers
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const app = express();
app.use(express.json());

app.post("/partner", async (req, res) => {
  try {
    const { id, name, service } = req.body;
    const newPartner = await ShipmentPartner.create({
      id: id,
      name: name,
      service,
    });
    return res.status(201).json({ partner: newPartner });
  } catch (error) {
    console.log("registerPartner:", error);
    return res.status(500).send("internal server error");
  }
});

async function startServer() {
  await server.start();
  await mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("DB Connected");
  server.applyMiddleware({ app });
}

startServer().then(() => {
  app.listen(port, () => {
    console.log(`Listening at Port ${port}`);
  });
});
