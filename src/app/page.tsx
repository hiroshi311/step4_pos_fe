"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

// 商品型定義
type Product = {
  id: number;  // ✅ ← 追加！
  code: string;
  name: string;
  price: number;
};


// カート型定義
type CartItem = {
  id: number;         // ✅ ← これが必須！
  code: string;
  name: string;
  price: number;
  quantity: number;
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannedCode, setScannedCode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [purchaseResult, setPurchaseResult] = useState<{
    totalAmt: number;
    transactionId: number;
  } | null>(null);

  // ✅ 商品APIを叩く関数
  const fetchProduct = async (code: string) => {
    console.log("✅ NEXT_PUBLIC_BACKEND_URL =", process.env.NEXT_PUBLIC_BACKEND_URL);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/product?code=${code}`, {
        method: "GET",
        mode: "cors",  // ✅ CORSモードを明示
      });
      
      const data = await res.json();
      if (data) {
        setScannedProduct(data); // { code, name, price }
      } else {
        setScannedProduct(null);
        alert("商品が見つかりません");
      }
    } catch (e) {
      console.error("商品取得エラー", e);
    }
  };

  // ✅ カメラ + バーコード読み取り
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
  
    codeReader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) {
          const code = result.getText();
          if (code !== scannedCode) {
            setScannedCode(code);
            fetchProduct(code);
            console.log("読み取り成功:", code);
          }
        }
      })
      .catch((err) => console.error("読み取りエラー:", err));
  
      return () => {
        if ("_reader" in codeReader) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (codeReader._reader as any).reset(); // ✅ 型エラーを無視して確実に実行
        }
      };
  }, [scannedCode]);

  // ✅ カートに追加処理
  const addToCart = () => {
    if (!scannedProduct) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.code === scannedProduct.code);
      if (existing) {
        return prev.map((item) =>
          item.code === scannedProduct.code
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...scannedProduct, quantity: 1 }];
      }
    });
  };

  // ✅ 合計計算
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePurchase = async () => {
    if (cart.length === 0) {
      alert("カートが空です");
      return;
    }
  
    try {
      console.log("送信先:", `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/purchase`);

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_cd: "9999999999",
          store_cd: "30",
          pos_no: "90",
          payment_method: "cash",
          details: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            tax_cd: "10",
          })),
        }),
      });
  
      const data = await res.json();
  
      if (res.ok) {
        // ✅ ここが今回の追加ポイント
        setPurchaseResult({
          totalAmt: data.totalAmt,
          transactionId: data.transactionId,
        });
  
        setCart([]);
        setScannedProduct(null);
      } else {
  const errorText = await res.text(); // HTMLかもしれないのでjsonじゃない！
  console.error("購入失敗:", errorText);
  alert("購入処理に失敗しました");
}
    } catch (err) {
      console.error("購入エラー", err);
      alert("通信エラーが発生しました");
    }
  };
  
  
  if (purchaseResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fffdf7] px-6 text-center">
        <div className="bg-white shadow-lg rounded-2xl px-6 py-8 max-w-md w-full space-y-4">
          <h1 className="text-2xl font-bold text-green-600">🎉 購入完了</h1>
          <p className="text-sm text-gray-600">ありがとうございました！</p>
  
          <div className="text-left text-sm text-gray-700 space-y-1">
            <p>
              <span className="font-semibold">取引ID：</span>
              {purchaseResult.transactionId}
            </p>
            <p>
              <span className="font-semibold">合計金額：</span>
              <span className="text-lg font-bold text-black">
                ¥{purchaseResult.totalAmt.toLocaleString()}（税込）
              </span>
            </p>
          </div>
  
          <button
            onClick={() => setPurchaseResult(null)}
            className="mt-4 w-full bg-[#d67c2c] text-white font-bold py-2 rounded-xl shadow hover:bg-[#b55e17] transition"
          >
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf8f4] to-[#f1ede6] flex flex-col items-center px-4 py-6">
      <header className="w-full max-w-xs bg-[#d67c2c] text-white font-bold text-center py-2 rounded-t-2xl">
        📱 ホーム画面
      </header>

      <main className="w-full max-w-xs bg-white shadow rounded-b-2xl px-4 py-6 flex flex-col gap-6 items-center">
        <h1 className="text-[#c25a2d] text-lg font-bold">テクワン POP UP</h1>
        <hr className="w-full border-t border-gray-200" />

        {/* 📷 カメラ */}
        <div className="border border-dashed border-orange-200 rounded-xl w-full p-4 flex flex-col items-center gap-2">
          <video ref={videoRef} className="rounded-lg w-full" />
          {scannedProduct && (
            <div className="text-center w-full">
              <p className="font-bold">{scannedProduct.name}</p>
              <p>¥{scannedProduct.price.toLocaleString()}</p>
              <button
                onClick={addToCart}
                className="mt-2 bg-blue-500 text-white px-4 py-1 rounded"
              >
                追加
              </button>
            </div>
          )}
        </div>

        {/* 🛒 カート表示 */}
        <div className="w-full border-t pt-4">
          <h2 className="text-sm font-bold mb-2">🛒 カート</h2>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-sm">商品をスキャンしてください</p>
          ) : (
            <ul className="text-sm space-y-1">
              {cart.map((item) => (
                <li key={item.code}>
                  {item.name} × {item.quantity}：{item.price * item.quantity}円
                </li>
              ))}
            </ul>
          )}
          {cart.length > 0 && (
            <p className="mt-2 font-bold text-right">
              合計: ¥{total.toLocaleString()}（税込 ¥{(total * 1.1).toLocaleString()}）
            </p>
          )}
        </div>

        <button
          onClick={handlePurchase}
          className="mt-4 bg-gradient-to-b from-[#f1cc9c] to-[#e4b676] text-white font-bold py-2 px-6 rounded-xl shadow w-full"
        >
          購入する
        </button>
      </main>
    </div>
  );
}