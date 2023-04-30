const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const { request: gqlRequest } = require("graphql-request");
const Joi = require("joi");

const typeDefs = gql`
  type Query {
    products: [Product]
    orders: [Order]
  }

  type Product {
    id: ID!
    name: String!
    price: Float!
    description: String
  }

  type User {
    id: ID!
    name: String
    address: String
    phoneNo: String
  }

  type Order {
    id: ID!
    user: User
    address: String
    contact: String
    products: [Product]
    total: Float
    txnId: String
    shipmentPartner: ShipmentPartner
    trackingId: String
    paymentMethod: String
  }

  type ShipmentPartner {
    id: ID!
    name: String
    serviceURI: String
  }

  input OrderInput {
    userId: ID!
    txnId: String!
    productIds: [ID!]!
    paymentMethod: String
  }

  type Mutation {
    createOrder(input: OrderInput): Order
  }
`;
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const resolvers = {
  Mutation: {
    createOrder: async (_parent, { input }) => {
      const { userId, txnId, productIds, paymentMethod } = input;

      // Validate input using Joi
      const schema = Joi.object({
        userId: Joi.string().required(),
        txnId: Joi.string().required(),
        productIds: Joi.array().items(Joi.string()).min(1).required(),
        paymentMethod: Joi.string().valid("COD", "Online").required(),
      });
      const { error } = schema.validate(input);
      if (error) {
        throw new Error(error.message);
      }

      // Retrieve the user and products from the Prisma Client
      const user = await prisma.user.findFirst({ where: { id: userId } });
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      // Calculate the total price of the order
      const total = products.reduce((acc, product) => acc + product.price, 0);

      const partners = await prisma.shipmentPartner.findMany();

      // Create a new order object
      const order = await prisma.order.create({
        data: {
          user: { connect: { id: userId } },
          products: { connect: productIds.map((id) => ({ id })) },
          contact: user.phoneNo,
          address: user.address,
          total,
          txnId,
          shipmentPartner: {
            connect: {
              id: partners[0].id,
            },
          },
          trackingId: null,
          paymentMethod: paymentMethod,
        },
      });

      const registerDeliveryMutation = gql`
        mutation RegisterDelivery($input: OrderInput) {
          registerDelivery(input: $input) {
            success
            msg
            trackingID
          }
        }
      `;
      const orderInput = {
        id: order.id,
        customerName: user.name,
        customerAddress: user.address,
        customerContact: user.phoneNo,
        items: products.map((product) => {
          return {
            id: product.id,
            name: product.name,
            quantity: 1,
            pricePerUnit: product.price,
          };
        }),
        billAmount: total,
        shipmentPartnerID: partners[0].id,
        paymentMethod: paymentMethod,
      };
      const middleWareURI = "http://localhost:5000/graphql";
      const fullfillmentResult = await gqlRequest(
        middleWareURI,
        registerDeliveryMutation,
        { input: orderInput }
      );

      // Update the order object with the shipment partner and tracking ID
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          trackingId: fullfillmentResult.trackingId,
        },
      });

      // Return the updated order object
      return updatedOrder;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.log(error);
    return {
      message: error.message,
      code: error.extensions.code,
    };
  },
});

const app = express();

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });
}

startServer().then(() => {
  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
});
