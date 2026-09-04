"use client";

import { forwardRef, useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import type { Product } from "../data/products";
import { formatMoney } from "../data/products";

type ReceiptProps = {
  product: Product;
  result: string;
  orderNo: string;
  date: string;
  variant?: "full" | "share";
};

function RollingOrder({ orderNo, animate }: { orderNo: string; animate: boolean }) {
  const [visible, setVisible] = useState("000000");

  useEffect(() => {
    if (!animate) return;

    let tick = 0;
    const timer = window.setInterval(() => {
      tick += 1;
      if (tick >= 7) {
        setVisible(orderNo);
        window.clearInterval(timer);
        return;
      }
      setVisible(String(Math.floor(100000 + Math.random() * 900000)));
    }, 55);

    return () => window.clearInterval(timer);
  }, [animate, orderNo]);

  return <span>NO. {animate ? visible : orderNo}</span>;
}

export const Receipt = forwardRef<HTMLElement, ReceiptProps>(function Receipt(
  { product, result, orderNo, date, variant = "full" },
  ref,
) {
  const isShare = variant === "share";

  return (
    <article ref={ref} className={`certificate ${isShare ? "share-certificate" : ""}`}>
      {isShare && <BrandLogo className="page-brand-share" />}
      <div className="certificate-topline">
        <span>{isShare ? "没什么用商店 · 黄林坑分店" : "没什么用商店"}</span>
        <span>003</span>
      </div>

      <header className="certificate-header">
        <p>{isShare ? "黄林坑临时生活事务办 · 今日专属凭证" : "电子交易及事项批准凭证"}</p>
        <h2>{product.name}</h2>
      </header>

      <div className="certificate-ledger">
        <div>
          <span>订单编号</span>
          <strong className="mono"><RollingOrder orderNo={orderNo} animate={!isShare} /></strong>
        </div>
        <div>
          <span>成交价格</span>
          <strong className="price-text">¥{formatMoney(product.price)}</strong>
        </div>
        <div>
          <span>签发日期</span>
          <strong className="mono">{date}</strong>
        </div>
      </div>

      <div className="ruling-block">
        <span>{isShare ? "经黄林坑临时生活事务办审核：" : "经本店审核，现正式告知："}</span>
        <blockquote>“{result}”</blockquote>
      </div>

      <div className="certificate-bottom">
        <div className="validity-copy">
          <span>有效期</span>
          <strong>{product.validity}</strong>
          <span>签发机构</span>
          <strong>{product.authority}</strong>
        </div>
        <div className="approval-stamp" aria-label={product.stamp}>
          <small>{isShare ? "黄林坑临时生活事务办" : "没什么用商店"}</small>
          <b>{isShare ? "黄林坑" : product.stamp}</b>
          <em>{isShare ? "审批通过" : date}</em>
        </div>
      </div>

      {isShare && (
        <div className="share-tagline">
          <span>这里卖一些正常商店买不到的东西。</span>
        </div>
      )}

      <div className="certificate-code" aria-hidden="true">
        <div className="barcode" />
        <span>{product.fileNo} / {orderNo}</span>
      </div>
    </article>
  );
});
