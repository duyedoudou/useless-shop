"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandLogo } from "./components/BrandLogo";
import { Receipt } from "./components/Receipt";
import {
  formatMoney,
  formatPrice,
  products,
  type Product,
} from "./data/products";
import { getFulfillmentStages, mockPaymentAdapter } from "./lib/payment";
import { fulfillmentSound, getWarehouseBroadcast } from "./lib/sound";

type Screen = "home" | "detail" | "processing" | "result";

type GeneratedOrder = {
  orderNo: string;
  result: string;
  date: string;
};

function makeOrderNo() {
  const random = new Uint32Array(1);
  window.crypto.getRandomValues(random);
  return String(100000 + (random[0] % 900000));
}

function getToday() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("/", ".");
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function Storefront({ onSelect }: { onSelect: (product: Product) => void }) {
  const featured = products[0];
  const quickProducts = [products[1], products[2], products[4]];
  const moreProducts = [products[3], products[5], products[6], products[7]];

  const productRow = (product: Product) => (
    <button
      className="product-row"
      key={product.id}
      type="button"
      onClick={() => onSelect(product)}
      aria-label={`查看${product.name}，价格 ${formatPrice(product.price)} 元`}
    >
      <span>{product.name}</span>
      <strong>¥{formatMoney(product.price)}</strong>
      <i aria-hidden="true">→</i>
    </button>
  );

  return (
    <div className="paper-page storefront-page">
      <BrandLogo className="page-brand-home" />
      <header className="shop-header">
        <div className="bureau-line">
          <span>黄林坑临时生活事务办</span>
          <span>003</span>
        </div>

        <div className="title-lockup">
          <h1>没什么用<span>商店</span></h1>
        </div>

        <p className="shop-subtitle">卖一点没什么用，但可能今天正好需要的东西。</p>
      </header>

      <section className="featured-section" aria-label="今日首推">
        <button
          className="featured-product"
          type="button"
          onClick={() => onSelect(featured)}
          aria-label={`申请${featured.name}，价格 ${formatPrice(featured.price)} 元`}
        >
          <span className="featured-brush" aria-hidden="true" />
          <span className="featured-label">今日首推</span>
          <h2>{featured.name}</h2>
          <p>{featured.summary}</p>
          <strong className="featured-price">¥{formatMoney(featured.price)}</strong>
          <span className="featured-cta">申请一张 <i aria-hidden="true">→</i></span>
          <span className="huanglinkeng-seal" aria-hidden="true">
            <b>黄林坑</b>
            <small>今日受理</small>
          </span>
        </button>
      </section>

      <section className="goods-section" aria-labelledby="goods-title">
        <div className="section-heading">
          <h2 id="goods-title">今日可申请事项</h2>
          <span>另有 07 项</span>
        </div>

        <div className="product-list">
          {quickProducts.map(productRow)}
          <details className="more-products">
            <summary><span>展开剩余 4 项</span><i aria-hidden="true">＋</i></summary>
            <div>{moreProducts.map(productRow)}</div>
          </details>
        </div>
      </section>

      <footer className="shop-footer">
        <p>本店商品均无实物，请谨慎消费。</p>
      </footer>
    </div>
  );
}

function DetailView({
  product,
  paymentError,
  onBack,
  onCheckout,
}: {
  product: Product;
  paymentError: string;
  onBack: () => void;
  onCheckout: () => void;
}) {
  const buttonCopy = product.cta.includes("¥")
    ? product.cta
    : `${product.cta} · ¥${formatPrice(product.price)}`;

  return (
    <div className="paper-page view-page detail-view">
      <BrandLogo className="page-brand-detail" />
      <nav className="view-nav">
        <button type="button" onClick={onBack} aria-label="返回商品列表">← 返回</button>
        <span>事项详情 / {product.fileNo}</span>
      </nav>

      <article className="detail-document">
        <header className="detail-header">
          <div className="detail-mark" aria-hidden="true">{product.mark}</div>
          <p>非实体商品申请表</p>
          <h1>{product.name}</h1>
          <div className="detail-price"><small>核定价格</small><strong>¥{formatPrice(product.price)}</strong></div>
        </header>

        <p className="detail-intro">{product.intro}</p>

        <section className="document-section">
          <h2><span>01</span> 适用人群</h2>
          <ul className="applicable-list">
            {product.applicable.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="document-section">
          <h2><span>02</span> 商品说明</h2>
          <p>{product.description}</p>
        </section>

        <section className="detail-ledger">
          <div><span>签发机构</span><strong>{product.authority}</strong></div>
          <div><span>凭证有效期</span><strong>{product.validity}</strong></div>
          <div><span>交付方式</span><strong>付款后立即签发</strong></div>
        </section>

        <aside className="disclaimer">
          <strong>免责声明</strong>
          <p>{product.disclaimer}</p>
        </aside>
      </article>

      <div className="action-dock">
        {paymentError && <p className="payment-error" role="alert">{paymentError}</p>}
        <button className="primary-action" type="button" onClick={onCheckout}>{buttonCopy}</button>
        <small>演示支付 · 不会产生真实扣款</small>
      </div>
    </div>
  );
}

function ProcessingView({
  product,
  step,
  soundEnabled,
  onToggleSound,
}: {
  product: Product;
  step: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  const stages = getFulfillmentStages(product);
  const activeIndex = Math.min(step, stages.length - 1);
  const activeStage = stages[activeIndex];
  const progress = Math.round(((activeIndex + 1) / stages.length) * 100);
  const broadcast = getWarehouseBroadcast(product, activeIndex);

  return (
    <div className="paper-page view-page processing-view">
      <BrandLogo className="page-brand-processing" />
      <section className="fulfillment-console" aria-label="订单生产与交付进度">
        <header className="fulfillment-topbar">
          <div className="live-indicator"><i aria-hidden="true" /> LIVE</div>
          <strong>黄林坑紧急交付中心</strong>
          <div className="fulfillment-controls">
            <span>{String(activeIndex + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}</span>
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundEnabled ? "关闭交付音效" : "开启交付音效"}
              aria-pressed={soundEnabled}
            >{soundEnabled ? "音 ON" : "音 OFF"}</button>
          </div>
        </header>

        <div className="fulfillment-heading">
          <p>ORDER {product.fileNo} · PRIORITY / 紧急但没必要</p>
          <h1>正在生产一件<br /><em>{product.name}</em></h1>
          <div className="order-spec">
            <span>数量 <b>01</b></span>
            <span>实物 <b>0%</b></span>
            <span>交付 <b>立即</b></span>
          </div>
        </div>

        <div className="station-panel">
          <div className="station-panel-head">
            <span>当前工位 / {activeStage.code}</span>
            <b><i aria-hidden="true" /> 紧急办理中</b>
          </div>
          <div className="station-main">
            <div className="station-number" aria-hidden="true">{String(activeIndex + 1).padStart(2, "0")}</div>
            <div>
              <small>{activeStage.department}</small>
              <h2>{activeStage.name}</h2>
              <p aria-live="polite">{activeStage.message}</p>
              {broadcast && (
                <div className="warehouse-broadcast" key={broadcast}>
                  <span>人声广播</span>
                  <q>{broadcast}</q>
                </div>
              )}
            </div>
          </div>
          <div className="signal-line" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => <i key={index} />)}
          </div>
        </div>

        <ol className="production-line" aria-label="八道生产工序">
          {stages.map((stage, index) => {
            const status = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
            return (
              <li className={status} key={stage.code}>
                <span>{status === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span>
                <div><small>{stage.code}</small><b>{stage.name}</b></div>
              </li>
            );
          })}
        </ol>

        <div className="conveyor" aria-hidden="true">
          <div className="conveyor-label"><span>非实体输送带</span><b>FORWARD →</b></div>
          <div className="conveyor-track">
            <i /><i /><i /><i /><i /><i /><i /><i />
            <div className="virtual-parcel" key={activeStage.code}><span>{product.mark}</span></div>
          </div>
        </div>

        <div className="warehouse-telemetry">
          <div><span>虚拟库存</span><strong>{activeIndex < 2 ? "核验中" : "01 份"}</strong></div>
          <div><span>生产批次</span><strong>HLK-{product.fileNo.slice(3, 5)}</strong></div>
          <div><span>物流状态</span><strong>{activeIndex === stages.length - 1 ? "出库中" : "厂内流转"}</strong></div>
        </div>

        <footer className="fulfillment-footer">
          <div className="fulfillment-progress" aria-label={`订单进度 ${progress}%`}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <div><span>{activeStage.telemetry}</span><strong>{progress}%</strong></div>
          <small>请留在本页 · 工作人员正在为一件不存在的商品全力奔忙</small>
        </footer>
      </section>
    </div>
  );
}

function ResultView({
  product,
  order,
  onShare,
  onAgain,
  onChange,
}: {
  product: Product;
  order: GeneratedOrder;
  onShare: () => void;
  onAgain: () => void;
  onChange: () => void;
}) {
  return (
    <div className="paper-page view-page result-view">
      <BrandLogo className="page-brand-result" />
      <div className="result-heading">
        <span className="result-check">✓</span>
        <div><p>PAYMENT APPROVED</p><h1>付款成功，凭证已签发</h1></div>
      </div>

      <Receipt
        product={product}
        result={order.result}
        orderNo={order.orderNo}
        date={order.date}
      />

      <div className="result-actions">
        <button className="primary-action" type="button" onClick={onShare}>生成今日凭证</button>
        <div>
          <button type="button" onClick={onChange}>换一个商品</button>
          <button type="button" onClick={onAgain}>再买一次</button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [selected, setSelected] = useState<Product | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [generatedOrder, setGeneratedOrder] = useState<GeneratedOrder | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.localStorage.getItem("useless-shop-sound") !== "off",
  );
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const shareCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fulfillmentSound.setEnabled(soundEnabled);

    return () => fulfillmentSound.stop();
  }, [soundEnabled]);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "instant" });

  const chooseProduct = (product: Product) => {
    fulfillmentSound.stop();
    setSelected(product);
    setGeneratedOrder(null);
    setPaymentError("");
    setScreen("detail");
    scrollTop();
  };

  const goHome = () => {
    fulfillmentSound.stop();
    setScreen("home");
    setSelected(null);
    setGeneratedOrder(null);
    setPaymentError("");
    scrollTop();
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.localStorage.setItem("useless-shop-sound", next ? "on" : "off");
    fulfillmentSound.setEnabled(next);
    if (next) void fulfillmentSound.previewEnabled();
  };

  const completeMockPayment = async () => {
    if (!selected) return;
    fulfillmentSound.setEnabled(soundEnabled);
    if (soundEnabled) {
      await fulfillmentSound.unlock();
      void fulfillmentSound.prepareVoices(selected);
    }
    setPaymentOpen(false);
    setPaymentError("");
    setProcessingStep(0);
    setScreen("processing");
    scrollTop();

    try {
      await mockPaymentAdapter.pay(selected);
      const stages = getFulfillmentStages(selected);

      for (const [step] of stages.entries()) {
        setProcessingStep(step);
        await waitForNextPaint();
        await fulfillmentSound.playStageAndWait(step, selected);
      }

      const result = selected.results[Math.floor(Math.random() * selected.results.length)];
      setGeneratedOrder({
        orderNo: makeOrderNo(),
        result,
        date: getToday(),
      });
      setScreen("result");
      scrollTop();
      await waitForNextPaint();
      fulfillmentSound.playResult();
    } catch {
      fulfillmentSound.stop();
      setPaymentError("办理窗口短暂离岗，请稍后再试。");
      setScreen("detail");
    }
  };

  const downloadShareCard = async () => {
    if (!shareCardRef.current || !selected || !generatedOrder || downloadStatus === "saving") return;

    const card = shareCardRef.current;
    setDownloadStatus("saving");
    card.classList.add("is-exporting");

    try {
      await document.fonts.ready;
      const dataUrl = await toPng(card, {
        backgroundColor: "#f1e8d3",
        cacheBust: true,
        canvasWidth: 1080,
        canvasHeight: 1440,
        pixelRatio: 1,
        skipAutoScale: true,
      });

      const link = document.createElement("a");
      link.download = `没什么用商店-${selected.name}-NO${generatedOrder.orderNo}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadStatus("success");
      window.setTimeout(() => setDownloadStatus("idle"), 2400);
    } catch {
      setDownloadStatus("error");
    } finally {
      card.classList.remove("is-exporting");
    }
  };

  return (
    <main className="site-shell">
      {screen === "home" && <Storefront onSelect={chooseProduct} />}

      {screen === "detail" && selected && (
        <DetailView
          product={selected}
          paymentError={paymentError}
          onBack={goHome}
          onCheckout={() => setPaymentOpen(true)}
        />
      )}

      {screen === "processing" && selected && (
        <ProcessingView
          product={selected}
          step={processingStep}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
        />
      )}

      {screen === "result" && selected && generatedOrder && (
        <ResultView
          product={selected}
          order={generatedOrder}
          onShare={() => setShareOpen(true)}
          onAgain={() => chooseProduct(selected)}
          onChange={goHome}
        />
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="payment-dialog">
          <BrandLogo className="page-brand-payment" />
          <div className="dialog-fileline">PAYMENT / 模拟收银台</div>
          <DialogTitle>确认支付</DialogTitle>
          <DialogDescription>
            本页面为体验演示，不会唤起微信，也不会产生真实扣款。
          </DialogDescription>
          {selected && (
            <>
              <div className="payment-slip">
                <div><span>购买事项</span><strong>{selected.name}</strong></div>
                <div><span>数量</span><strong>1</strong></div>
                <div className="payment-total"><span>应付金额</span><strong>¥{formatMoney(selected.price)}</strong></div>
              </div>
              <button className="primary-action" type="button" onClick={completeMockPayment}>
                模拟支付成功
              </button>
              <div className="payment-sound-row">
                <div>
                  <span>交付音效</span>
                  <small>点击支付后立即启动仓库广播</small>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-pressed={soundEnabled}
                >{soundEnabled ? "开启中" : "已静音"}</button>
              </div>
              <p className="safe-copy">模拟环境 · {soundEnabled ? "音效已待命" : "当前静音"} · 不会产生真实扣款</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="share-dialog">
          <DialogTitle className="sr-only">今日凭证分享卡片</DialogTitle>
          <DialogDescription className="sr-only">
            下载或截图保存这张凭证卡片。
          </DialogDescription>
          {selected && generatedOrder && (
            <div className="share-stage">
              <Receipt
                ref={shareCardRef}
                product={selected}
                result={generatedOrder.result}
                orderNo={generatedOrder.orderNo}
                date={generatedOrder.date}
                variant="share"
              />
              <button
                className="share-download"
                type="button"
                onClick={downloadShareCard}
                disabled={downloadStatus === "saving"}
              >
                {downloadStatus === "saving" ? "正在生成图片…" : downloadStatus === "success" ? "图片已下载 ✓" : "下载图片"}
              </button>
              <p className={downloadStatus === "error" ? "share-hint error" : "share-hint"} role="status">
                {downloadStatus === "error"
                  ? "图片生成失败，请重试或直接截图保存。"
                  : "生成 1080 × 1440 PNG · 适合朋友圈 / 小红书"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
