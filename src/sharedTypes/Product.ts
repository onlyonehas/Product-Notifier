interface ProductData {
    date: string;
    result?: ExtractedData;
    price: Price;
    productUrl: string;
    desiredPrice: number;
    monitorEnabled: boolean;
}

interface ExtractedData {
    title: string;
    newPrice: string;
    matched: string;
}

interface Price {
    price: string;
    cost: string;
    profit: string;
    roi?: string;
}

export {
    ProductData,
    ExtractedData,
    Price
}