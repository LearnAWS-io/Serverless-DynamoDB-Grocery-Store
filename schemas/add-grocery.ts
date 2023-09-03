import v from "@vinejs/vine";

const AddGroceryObj = v.array(
  v.object({
    category: v.string(),
    name: v.string(),
    type: v.string(),
    stocks: v.number(),
    price: v.object({
      inr: v.number(),
      usd: v.number(),
    }),
  }),
);

export const addGroceryObjValidator = v.compile(AddGroceryObj);
