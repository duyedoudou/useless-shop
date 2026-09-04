import type { Product } from "../data/products";

export type PaymentResult = {
  transactionId: string;
  paidAt: string;
};

export type FulfillmentStage = {
  code: string;
  name: string;
  department: string;
  message: string;
  telemetry: string;
};

export interface PaymentAdapter {
  pay: (product: Product) => Promise<PaymentResult>;
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function getFulfillmentStages(product: Product): FulfillmentStage[] {
  const productMessages = product.processing;

  return [
    {
      code: "PAY",
      name: "收款入账",
      department: "财务确认窗口",
      message: `已收到 ¥${product.price.toFixed(2)}，正在为本单开辟紧急通道……`,
      telemetry: "账款无误 / 优先级已上调",
    },
    {
      code: "CALL",
      name: "联络仓库",
      department: "黄林坑仓储科",
      message: `正在紧急呼叫“${product.name}”专属库管员……`,
      telemetry: "内线占用 / 第 3 次呼叫中",
    },
    {
      code: "STOCK",
      name: "库存核验",
      department: "非实体货架 03",
      message: productMessages[0] ?? "正在翻找今日剩余库存……",
      telemetry: "扫描货位 / 清点不存在的库存",
    },
    {
      code: "PICK",
      name: "拣货备料",
      department: "情绪原料分拣台",
      message: productMessages[1] ?? "库管员正在从空货架上认真拣货……",
      telemetry: "原料已找到 / 数量 01 份",
    },
    {
      code: "MAKE",
      name: "紧急制作",
      department: "荒诞生产一线",
      message: productMessages[2] ?? "正在临时制作一件只属于你的东西……",
      telemetry: "生产线提速 / 禁止催单",
    },
    {
      code: "QC",
      name: "质量复核",
      department: "没用程度检测室",
      message: "正在确认它确实没有实物，但多少能派上一点用场……",
      telemetry: "情绪价值合格 / 实物含量 0%",
    },
    {
      code: "STAMP",
      name: "凭证盖章",
      department: "黄林坑签发处",
      message: productMessages[3] ?? "审批员正在蘸取红色印泥……",
      telemetry: "印章升温 / 签发权限正常",
    },
    {
      code: "SHIP",
      name: "出库交付",
      department: "电子发货窗口",
      message: `已完成装袋，“${product.name}”正在穿过黄林坑村口……`,
      telemetry: "电子货物在途 / 即将当面签收",
    },
  ];
}

/**
 * Demo payment adapter.
 * Replace this object with a WeChat Pay adapter later; the page flow does not
 * need to know whether payment is simulated or confirmed by a backend.
 */
export const mockPaymentAdapter: PaymentAdapter = {
  async pay(product) {
    await wait(260);

    return {
      transactionId: `MOCK-${product.id}-${Date.now()}`,
      paidAt: new Date().toISOString(),
    };
  },
};
