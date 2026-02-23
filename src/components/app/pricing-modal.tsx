"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Headphones,
  MessageSquare,
  Package,
  Pencil,
  Search,
  Settings,
  Tag,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/toast";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PlanFeature {
  icon: React.ReactNode;
  text: string;
}

interface Plan {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  period: string;
  description: string;
  badge?: string;
  discount: string;
  features: PlanFeature[];
  buttonLabel: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    monthlyPrice: "50,000",
    annualPrice: "39,900",
    discount: "20%",
    period: "원/월",
    badge: "신규 할인",
    description: "이제 막 사업을 시작한 사장님!",
    features: [
      { icon: <Search className="size-4" />, text: "상품 검색 (3,000회/월)" },
      { icon: <Pencil className="size-4" />, text: "상품명 최적화 (3,000회/월)" },
      { icon: <FileText className="size-4" />, text: "상세페이지 생성 (50회/월)" },
      { icon: <Tag className="size-4" />, text: "최저가 업데이트 (3,000회/월)" },
      { icon: <Package className="size-4" />, text: "주문 자동처리 (300건/월)" },
      { icon: <MessageSquare className="size-4" />, text: "고객문의 자동응답 (300건/월)" },
    ],
    buttonLabel: "시작하기",
  },
  {
    name: "Pro",
    monthlyPrice: "200,000",
    annualPrice: "149,900",
    discount: "25%",
    period: "원/월",
    badge: "신규 할인",
    description: "사업을 본격적으로 키우고 싶은 사장님!",
    highlighted: true,
    features: [
      { icon: <Search className="size-4" />, text: "상품 검색 (20,000회/월)" },
      { icon: <Pencil className="size-4" />, text: "상품명 최적화 (20,000회/월)" },
      { icon: <FileText className="size-4" />, text: "상세페이지 생성 (400회/월)" },
      { icon: <Tag className="size-4" />, text: "최저가 업데이트 (20,000회/월)" },
      { icon: <Package className="size-4" />, text: "주문 자동처리 (2,000건/월)" },
      { icon: <MessageSquare className="size-4" />, text: "고객문의 자동응답 (2,000건/월)" },
      { icon: <Settings className="size-4" />, text: "스토어 진단 및 컨설팅 (1회/월)" },
    ],
    buttonLabel: "Pro로 업그레이드",
  },
  {
    name: "Enterprise",
    monthlyPrice: "1,000,000",
    annualPrice: "699,000",
    discount: "30%",
    period: "원/월",
    badge: "신규 할인",
    description: "직원과 사업하는 사장님을 위한!",
    features: [
      { icon: <Search className="size-4" />, text: "상품 검색 (무제한)" },
      { icon: <Pencil className="size-4" />, text: "상품명 최적화 (무제한)" },
      { icon: <FileText className="size-4" />, text: "상세페이지 생성 (2,000회/월)" },
      { icon: <Tag className="size-4" />, text: "최저가 업데이트 (무제한)" },
      { icon: <Package className="size-4" />, text: "주문 자동처리 (무제한)" },
      { icon: <MessageSquare className="size-4" />, text: "고객문의 자동응답 (무제한)" },
      { icon: <Settings className="size-4" />, text: "스토어 진단 및 컨설팅 (4회/월)" },
      { icon: <Headphones className="size-4" />, text: "전용 고객 지원" },
      { icon: <Wrench className="size-4" />, text: "맞춤형 솔루션" },
    ],
    buttonLabel: "Enterprise 시작하기",
  },
];

export function PricingModal({ open, onOpenChange }: PricingModalProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-neutral-100"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                요금제 소개
              </h2>

              {/* Billing toggle */}
              <div className="mt-4 inline-flex items-center rounded-full bg-neutral-100 p-1">
                <button
                  onClick={() => setBilling("monthly")}
                  className={`relative rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                    billing === "monthly"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  월결제
                </button>
                <button
                  onClick={() => setBilling("annual")}
                  className={`relative rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                    billing === "annual"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  연간 결제
                  <span className="ml-1.5 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    20~30% 할인
                  </span>
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {PLANS.map((plan) => {
                const price =
                  billing === "monthly"
                    ? plan.monthlyPrice
                    : plan.annualPrice;

                return (
                  <div
                    key={plan.name}
                    className={`flex flex-col rounded-xl border p-6 transition-shadow ${
                      plan.highlighted
                        ? "border-black shadow-[0_0_0_1px_rgba(0,0,0,1)]"
                        : "border-border/60"
                    }`}
                  >
                    {/* Plan name */}
                    <h3 className="text-xl font-bold">{plan.name}</h3>

                    {/* Badge */}
                    {plan.badge && (
                      <span className="mt-2 inline-flex w-fit rounded-full bg-black px-3 py-0.5 text-xs font-medium text-white">
                        {plan.badge}
                      </span>
                    )}

                    {/* Price */}
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">
                        {price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>

                    {/* Annual discount note */}
                    {billing === "annual" && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">
                          {plan.monthlyPrice}원
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {plan.discount} 할인
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    <p className="mt-2 text-sm text-muted-foreground">
                      {billing === "monthly" ? "매월 자동 결제" : "연간 결제 · 무이자 할부"}
                    </p>
                    <p className="mt-0.5 text-sm italic text-muted-foreground">
                      {plan.description}
                    </p>

                    {/* CTA button */}
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        toast.info("결제 기능이 곧 추가됩니다");
                      }}
                      className={`mt-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                        plan.highlighted
                          ? "bg-black text-white hover:bg-neutral-800"
                          : "border border-border bg-white text-foreground hover:bg-neutral-50"
                      }`}
                    >
                      {plan.buttonLabel}
                    </button>

                    {/* Features */}
                    <div className="mt-6 flex flex-col gap-3">
                      {plan.features.map((feature, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 text-sm text-foreground"
                        >
                          <span className="mt-0.5 flex-shrink-0 text-muted-foreground">
                            {feature.icon}
                          </span>
                          {feature.text}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
