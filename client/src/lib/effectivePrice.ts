export type ActivePromotion = {
  productId: number;
  name: string;
  promotionalPrice: string | number;
};

export function resolveEffectivePrice(productId: number, regularPrice: string | number, promotions: ActivePromotion[] | undefined) {
  const promotion = promotions?.find(item => item.productId === productId);
  return {
    promotion,
    price: Number(promotion?.promotionalPrice ?? regularPrice),
  };
}
