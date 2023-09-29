import v from "@vinejs/vine";

export const GroceryItemObj = v.object({
  category: v.string().toUpperCase(),
  name: v.string().toUpperCase(),
  type: v.string().toUpperCase(),
  stocks: v.number(),
  price: v.object({
    inr: v.number(),
    usd: v.number(),
  }),
});

const AddGroceryObj = v.array(GroceryItemObj).maxLength(25);

export const addGroceryObjValidator = v.compile(AddGroceryObj);
export const groceryObjItemValidator = v.compile(GroceryItemObj);
