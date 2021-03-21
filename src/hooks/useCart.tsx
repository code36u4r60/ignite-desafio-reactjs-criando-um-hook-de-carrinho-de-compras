import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const existingProduct = cart.find((product) => product.id === productId);

      if (existingProduct) {
        const amount = existingProduct.amount + 1;
        updateProductAmount({ productId, amount });
      } else {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );

        if (!product) {
          throw new Error("Product not found...");
        }

        const {
          data: { amount },
        } = await api.get<Stock>(`/stock/${productId}`);

        if (amount < 0) {
          toast.error("'Quantidade solicitada fora de estoque'");
        } else {
          product.amount = 1;
          const newCard = [...cart, product];
          setCart(newCard);
          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCard));
        }
      }
    } catch (error) {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existingProduct = cart.find((product) => product.id === productId);
      if (!existingProduct) {
        throw new Error("Product not found...");
      }
      const newCard = cart.filter((product) => product.id !== productId);
      setCart(newCard);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCard));
    } catch (error) {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error("Cannot update to negative values");
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        const newCart = cart.map((product) =>
          product.id === productId ? { ...product, amount } : product
        );
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);
  return context;
}
