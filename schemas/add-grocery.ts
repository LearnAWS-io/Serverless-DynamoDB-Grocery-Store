import v from "@vinejs/vine";

const AddGroceryObj = v.array(
  v.object({
    category: v.string().toUpperCase(),
    name: v.string().toUpperCase(),
    type: v.string().toUpperCase(),
    stocks: v.number(),
    price: v.object({
      inr: v.number(),
      usd: v.number(),
    }),
  }),
);

export const addGroceryObjValidator = v.compile(AddGroceryObj);
