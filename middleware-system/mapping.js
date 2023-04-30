const base = {
  id: 123,
  customerName: "John Doe",
  customerAddress: "Wall st.",
  customerContact: "123-122-1234",
  paymentMethod: "ONLINE",
  products: [
    {
      id: 123,
      name: "Apple Pen",
      pricePerUnit: 100,
      quantity: 2,
    },
    {
      id: 124,
      name: "Apple Cover",
      pricePerUnit: 50,
      quantity: 1,
    },
  ],
  billAmount: 250,
};

// Define the mapping function
const convertData = (base, mapping) => {
  const result = {};

  for (const key in mapping) {
    const path = mapping[key];
    if (typeof path === "string") {
      const parts = path.split(".");
      let value = base;
      for (const part of parts) {
        value = value[part];
      }
      result[key] = value;
    } else if (Array.isArray(path)) {
      result[key] = base[path[0]].map((item) => convertData(item, path[1]));
    }
  }
  return result;
};

// Define the transformation schema
const transformationSchema = {
  orderID: "id",
  customerName: "customerName",
  customerAddress: "customerAddress",
  customerContact: "customerContact",
  paymentMode: "paymentMethod",
  items: [
    "items",
    {
      id: "id",
      name: "name",
      price: "pricePerUnit",
      quantity: "quantity",
    },
  ],
  totalPrice: "billAmount",
};

// // Convert the data using the mapping function and the transformation schema
// const convertedData = mapKeys(base, transformationSchema);
// console.log(convertedData);

module.exports = convertData;
