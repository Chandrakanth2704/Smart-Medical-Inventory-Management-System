export const CART_STORAGE_KEY = "hospillogix_cart";
export const CART_UPDATED_EVENT = "hospillogix_cart_updated";

export interface CartItem {
  medicineId: number;
  medicineName: string;
  genericName: string | null;
  strength: string | null;
  sellingPrice: number;
  availableQuantity: number;
  quantity: number;
}
